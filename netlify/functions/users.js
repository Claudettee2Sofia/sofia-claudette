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

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    var { action, data } = JSON.parse(event.body);

    // === CONNEXION NETLIFY IDENTITY ===
    if (action === 'connexion_netlify') {
      // Vérifier si l'utilisateur existe déjà
      var existing = await supabase('GET', 'utilisateurs', null,
        'code_acces=eq.' + data.id + '&select=*'
      );
      if (existing.length === 0) {
        // Créer l'utilisateur
        await supabase('POST', 'utilisateurs', {
          nom: data.nom,
          code_acces: data.id,
          cree_par: 'netlify',
          derniere_connexion: new Date().toISOString(),
          actif: true
        });
      } else {
        // Mettre à jour dernière connexion
        await supabase('PATCH', 'utilisateurs', {
          derniere_connexion: new Date().toISOString()
        }, 'code_acces=eq.' + data.id);
      }
      // Créer session
      var users = await supabase('GET', 'utilisateurs', null,
        'code_acces=eq.' + data.id + '&select=id'
      );
      if (users.length > 0) {
        await supabase('PATCH', 'sessions', { en_ligne: false },
          'utilisateur_id=eq.' + users[0].id + '&en_ligne=eq.true'
        );
        await supabase('POST', 'sessions', {
          utilisateur_id: users[0].id,
          en_ligne: true
        });
      }
      return { statusCode: 200, body: JSON.stringify({ succes: true }) };
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
      if (data.session_id) {
        await supabase('PATCH', 'sessions', {
          fin: new Date().toISOString(),
          en_ligne: false
        }, 'id=eq.' + data.session_id);
      }
      return { statusCode: 200, body: JSON.stringify({ succes: true }) };
    }

    // === LISTE UTILISATEURS (admin) ===
    if (action === 'liste') {
      var limite = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      await supabase('PATCH', 'sessions', { en_ligne: false },
        'debut=lt.' + limite + '&en_ligne=eq.true'
      );
      var users = await supabase('GET', 'utilisateurs', null,
        'select=*&order=derniere_connexion.desc.nullslast'
      );
      var sessions = await supabase('GET', 'sessions', null,
        'en_ligne=eq.true&select=utilisateur_id'
      );
      var enLigne = sessions.map(function(s) { return s.utilisateur_id; });
      users = users.map(function(u) {
        u.en_ligne = enLigne.includes(u.id);
        return u;
      });
      return { statusCode: 200, body: JSON.stringify({ utilisateurs: users }) };
    }

    // === HISTORIQUE ===
    if (action === 'historique') {
      var activites = await supabase('GET', 'activites', null,
        'utilisateur_id=eq.' + data.utilisateur_id + '&select=*&order=date.desc&limit=50'
      );
      return { statusCode: 200, body: JSON.stringify({ activites: activites }) };
    }

    // === SUPPRIMER UTILISATEUR ===
    if (action === 'supprimer') {
      await supabase('DELETE', 'utilisateurs', null, 'id=eq.' + data.utilisateur_id);
      return { statusCode: 200, body: JSON.stringify({ succes: true }) };
    }

    return { statusCode: 400, body: JSON.stringify({ erreur: 'Action inconnue' }) };

  } catch (error) {
    console.log('Users error:', error.message);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
