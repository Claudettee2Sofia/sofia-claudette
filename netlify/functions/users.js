const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ADMIN_EMAIL = 'planeteforest@gmail.com';
const MAX_INVITES_PAR_JOUR = 5;

async function supabase(method, table, data, query) {
  var url = SUPABASE_URL + '/rest/v1/' + table;
  if (query) url += '?' + query;
  var options = {
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Prefer': 'return=representation'
    }
  };
  if (data) options.body = JSON.stringify(data);
  var r = await fetch(url, options);
  if (!r.ok) {
    var err = await r.text();
    throw new Error('Supabase: ' + err);
  }
  var text = await r.text();
  return text ? JSON.parse(text) : [];
}

async function envoyerCourriel(sujet, contenu) {
  if (!RESEND_API_KEY) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + RESEND_API_KEY
      },
      body: JSON.stringify({
        from: 'Sofia <onboarding@resend.dev>',
        to: ADMIN_EMAIL,
        subject: sujet,
        html: contenu
      })
    });
  } catch(e) {
    console.log('Courriel non envoye:', e.message);
  }
}

async function compterInvitesDuJour() {
  var debut = new Date();
  debut.setHours(0, 0, 0, 0);
  var fin = new Date();
  fin.setHours(23, 59, 59, 999);
  try {
    var result = await supabase('GET', 'connexions_invites', null,
      'date=gte.' + debut.toISOString() + '&date=lte.' + fin.toISOString() + '&select=id'
    );
    return result.length;
  } catch(e) {
    return 0;
  }
}

async function enregistrerInvite(ip) {
  try {
    await supabase('POST', 'connexions_invites', {
      date: new Date().toISOString(),
      ip: ip || 'inconnue'
    });
  } catch(e) {
    console.log('Erreur enregistrement invite:', e.message);
  }
}

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    var { action, data } = JSON.parse(event.body);
    var ip = event.headers['x-forwarded-for'] || 'inconnue';
    var maintenant = new Date().toLocaleString('fr-CA', { timeZone: 'America/Toronto' });

    // === VERIFIER CODE INVITE DU JOUR ===
    if (action === 'verifier_invite') {
      var nbInvites = await compterInvitesDuJour();
      if (nbInvites >= MAX_INVITES_PAR_JOUR) {
        return { statusCode: 200, body: JSON.stringify({
          valide: false,
          erreur: 'limite',
          message: 'Le nombre maximum de visiteurs pour aujourd\'hui est atteint. Reessayez demain !'
        })};
      }
      await enregistrerInvite(ip);
      await envoyerCourriel(
        '🌟 Sofia — Nouvel invite connecte',
        '<h2>Un invite vient de se connecter a Sofia</h2>' +
        '<p><strong>Date et heure :</strong> ' + maintenant + '</p>' +
        '<p><strong>IP :</strong> ' + ip + '</p>' +
        '<p><strong>Invites aujourd\'hui :</strong> ' + (nbInvites + 1) + ' / ' + MAX_INVITES_PAR_JOUR + '</p>'
      );
      return { statusCode: 200, body: JSON.stringify({ valide: true, type: 'invite' }) };
    }

    // === VERIFIER CODE SUPABASE ===
   if (action === 'verifier' || action === 'verifier_code') {
      var users = await supabase('GET', 'utilisateurs', null,
        'code_acces=ilike.' + encodeURIComponent(data.code) + '&select=*'
      );
      if (users.length === 0) {
        return { statusCode: 200, body: JSON.stringify({ valide: false }) };
      }
      var user = users[0];
      await supabase('PATCH', 'utilisateurs', {
        derniere_connexion: new Date().toISOString()
      }, 'id=eq.' + user.id);
      try {
        await supabase('PATCH', 'sessions', { en_ligne: false, fin: new Date().toISOString() },
          'utilisateur_id=eq.' + user.id + '&en_ligne=eq.true'
        );
      } catch(e) {}
      var session = [];
      try {
        session = await supabase('POST', 'sessions', {
          utilisateur_id: user.id,
          en_ligne: true
        });
      } catch(e) {}
      await envoyerCourriel(
        '✅ Sofia — ' + user.nom + ' vient de se connecter',
        '<h2>' + user.nom + ' est maintenant connecte(e) a Sofia</h2>' +
        '<p><strong>Date et heure :</strong> ' + maintenant + '</p>' +
        '<p><strong>IP :</strong> ' + ip + '</p>'
      );
      return { statusCode: 200, body: JSON.stringify({
        valide: true,
        utilisateur: user,
        session_id: session[0] ? session[0].id : null
      })};
    }

    // === CONNEXION ADMIN ===
    if (action === 'connexion_admin') {
      await envoyerCourriel(
        '🔐 Sofia — Connexion administrateur',
        '<h2>Connexion admin a Sofia</h2>' +
        '<p><strong>Date et heure :</strong> ' + maintenant + '</p>' +
        '<p><strong>IP :</strong> ' + ip + '</p>'
      );
      return { statusCode: 200, body: JSON.stringify({ succes: true }) };
    }

    // === AJOUTER UTILISATEUR ===
    if (action === 'ajouter') {
      var dejaPris = await supabase('GET', 'utilisateurs', null,
        'code_acces=ilike.' + encodeURIComponent(data.code) + '&select=id'
      );
      if (dejaPris.length > 0) {
        return { statusCode: 200, body: JSON.stringify({ succes: false, erreur: 'Code deja utilise.' }) };
      }
      var nouvel = await supabase('POST', 'utilisateurs', {
        nom: data.nom,
        code_acces: data.code.toUpperCase(),
        cree_par: 'admin'
      });
      return { statusCode: 200, body: JSON.stringify({ succes: true, utilisateur: nouvel[0] }) };
    }

    // === ENREGISTRER ACTIVITE ===
    if (action === 'activite') {
      try {
        await supabase('POST', 'activites', {
          utilisateur_id: data.utilisateur_id,
          type: data.type,
          detail: data.detail || ''
        });
      } catch(e) {}
      return { statusCode: 200, body: JSON.stringify({ succes: true }) };
    }

    // === FIN SESSION ===
    if (action === 'fin_session') {
      if (data.session_id) {
        try {
          await supabase('PATCH', 'sessions', {
            fin: new Date().toISOString(),
            en_ligne: false
          }, 'id=eq.' + data.session_id);
        } catch(e) {}
      }
      return { statusCode: 200, body: JSON.stringify({ succes: true }) };
    }

    // === LISTE UTILISATEURS (admin) ===
    if (action === 'liste') {
      var users = await supabase('GET', 'utilisateurs', null,
        'select=*&order=nom.asc'
      );
      var nbInvites = await compterInvitesDuJour();
      return { statusCode: 200, body: JSON.stringify({
        utilisateurs: users,
        invites_aujourd_hui: nbInvites,
        invites_max: MAX_INVITES_PAR_JOUR
      })};
    }

    // === SUPPRIMER UTILISATEUR ===
    if (action === 'supprimer') {
      await supabase('DELETE', 'utilisateurs', null, 'id=eq.' + data.utilisateur_id);
      return { statusCode: 200, body: JSON.stringify({ succes: true }) };
    }

    // === CHANGER MON CODE ===
    if (action === 'changer_mon_code') {
      var dejaPris = await supabase('GET', 'utilisateurs', null,
        'code_acces=ilike.' + encodeURIComponent(data.nouveau_code) + '&select=id'
      );
      if (dejaPris.length > 0) {
        return { statusCode: 200, body: JSON.stringify({ succes: false, erreur: 'Code deja utilise.' }) };
      }
      await supabase('PATCH', 'utilisateurs', {
        code_acces: data.nouveau_code.toUpperCase()
      }, 'id=eq.' + data.utilisateur_id);
      return { statusCode: 200, body: JSON.stringify({ succes: true }) };
    }

    return { statusCode: 400, body: JSON.stringify({ erreur: 'Action inconnue' }) };

  } catch (error) {
    console.log('Users error:', error.message);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
