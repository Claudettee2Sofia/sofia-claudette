const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;

async function supabase(method, table, data, query) {
  var url = SUPABASE_URL + '/rest/v1/' + table;
  if (query) url += '?' + query;
  var options = {
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Prefer': method === 'POST' ? 'return=representation' : 'return=representation'
    }
  };
  if (data) options.body = JSON.stringify(data);
  var r = await fetch(url, options);
  if (!r.ok) {
    var err = await r.text();
    throw new Error('Supabase error: ' + err);
  }
  var text = await r.text();
  return text ? JSON.parse(text) : [];
}

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    var { action, data } = JSON.parse(event.body);

    // === CRÉER UTILISATEUR ===
    if (action === 'creer') {
      var existe = await supabase('GET', 'utilisateurs', null, 'code_acces=eq.' + data.code + '&select=id');
      if (existe.length > 0) {
        return { statusCode: 200, body: JSON.stringify({ erreur: 'Ce code existe déjà.' }) };
      }
      var user = await supabase('POST', 'utilisateurs', {
        nom: data.nom,
        code_acces: data.code.toUpperCase(),
        cree_par: 'admin'
      });
      return { statusCode: 200, body: JSON.stringify({ succes: true, utilisateur: user[0] }) };
    }

    // === VÉRIFIER CODE ACCÈS ===
    if (action === 'verifier') {
      var users = await supabase('GET', 'utilisateurs', null,
        'code_acces=eq.' + data.code.toUpperCase() + '&actif=eq.true&select=*'
      );
      if (users.length === 0) {
        return { statusCode: 200, body: JSON.stringify({ valide: false }) };
      }
      var user = users[0];
      // Mettre à jour dernière connexion
      await supabase('PATCH', 'utilisateurs', {
        derniere_connexion: new Date().toISOString()
      }, 'id=eq.' + user.id);
      // Créer session
      var session = await supabase('POST', 'sessions', {
        utilisateur_id: user.id,
        en_ligne: true
      });
      return { statusCode: 200, body: JSON.stringify({
        valide: true,
        utilisateur: user,
        session_id: session[0].id
      })};
    }

    // === ENREGISTRER ACTIVITÉ ===
    if (action === 'activite') {
      await supabase('POST', 'activites', {
        utilisateur_id: data.utilisateur_id,
        type: data.type,
        detail: data.detail || ''
      });
      return { statusCode: 200, body: JSON.stringify({ succes: true }) };
    }

    // === FIN SESSION ===
    if (action === 'fin_session') {
      await supabase('PATCH', 'sessions', {
        fin: new Date().toISOString(),
        en_ligne: false
      }, 'id=eq.' + data.session_id);
      return { statusCode: 200, body: JSON.stringify({ succes: true }) };
    }

    // === LISTE UTILISATEURS (admin) ===
    if (action === 'liste') {
      var users = await supabase('GET', 'utilisateurs', null, 'select=*&order=cree_le.desc');
      // Pour chaque user, vérifier si en ligne
      var sessions = await supabase('GET', 'sessions', null, 'en_ligne=eq.true&select=utilisateur_id');
      var enLigne = sessions.map(function(s) { return s.utilisateur_id; });
      users = users.map(function(u) {
        u.en_ligne = enLigne.includes(u.id);
        return u;
      });
      return { statusCode: 200, body: JSON.stringify({ utilisateurs: users }) };
    }

    // === HISTORIQUE UTILISATEUR (admin) ===
    if (action === 'historique') {
      var activites = await supabase('GET', 'activites', null,
        'utilisateur_id=eq.' + data.utilisateur_id + '&select=*&order=date.desc&limit=50'
      );
      return { statusCode: 200, body: JSON.stringify({ activites: activites }) };
    }

    // === MODIFIER MOT DE PASSE ===
    if (action === 'modifier_code') {
      var existe = await supabase('GET', 'utilisateurs', null,
        'code_acces=eq.' + data.nouveau_code.toUpperCase() + '&select=id'
      );
      if (existe.length > 0) {
        return { statusCode: 200, body: JSON.stringify({ erreur: 'Ce code est déjà utilisé.' }) };
      }
      await supabase('PATCH', 'utilisateurs', {
        code_acces: data.nouveau_code.toUpperCase()
      }, 'id=eq.' + data.utilisateur_id);
      return { statusCode: 200, body: JSON.stringify({ succes: true }) };
    }

    // === SUPPRIMER UTILISATEUR ===
    if (action === 'supprimer') {
      await supabase('DELETE', 'utilisateurs', null, 'id=eq.' + data.utilisateur_id);
      return { statusCode: 200, body: JSON.stringify({ succes: true }) };
    }

    // === CHANGER MOT DE PASSE (utilisateur lui-même) ===
    if (action === 'changer_mon_code') {
      var existe = await supabase('GET', 'utilisateurs', null,
        'code_acces=eq.' + data.nouveau_code.toUpperCase() + '&select=id'
      );
      if (existe.length > 0) {
        return { statusCode: 200, body: JSON.stringify({ erreur: 'Ce code est déjà utilisé. Choisissez-en un autre.' }) };
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
