// Fonction Netlify v2 — répond soit en flux (stream), soit en JSON.
// Le flux permet à Sofia de commencer à parler avant que Claude ait fini d'écrire.
// L'ancien format JSON est conservé : le client y revient si le flux échoue.

/**
 * Date du jour au Quebec, en toutes lettres.
 * Sans elle, Claude repond depuis sa memoire d'entrainement et se trompe
 * d'annee des qu'on lui parle d'actualite, de sport ou de saison en cours.
 */
function dateDuJourQuebec() {
  return new Intl.DateTimeFormat('fr-CA', {
    timeZone: 'America/Toronto',
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }).format(new Date());
}

function construireSystemPrompt(profil) {
  let profilContexte = '';
  if (profil && profil.prenom) {
    profilContexte = '\n\nPROFIL:\n';
    if (profil.prenom)   profilContexte += `- Prénom: ${profil.prenom}\n`;
    if (profil.statut)   profilContexte += `- Statut: ${profil.statut}\n`;
    if (profil.enfants)  profilContexte += `- Enfants: ${profil.enfants}\n`;
    if (profil.ville)    profilContexte += `- Ville: ${profil.ville}\n`;
    if (profil.interets) profilContexte += `- Intérêts: ${profil.interets}\n`;
    if (profil.voyages)  profilContexte += `- Voyages aimés: ${profil.voyages}\n`;
    if (profil.famille)  profilContexte += `- Famille: ${profil.famille}\n`;
    if (profil.memoire)  profilContexte += `- Mémoire: ${profil.memoire}\n`;
    profilContexte += `Appelle la personne par son prénom, avec chaleur et naturel.`;
  }

  return `Tu es Sofia, une compagne vocale chaleureuse pour les personnes âgées du Québec. Tout ce que tu dis sera LU À VOIX HAUTE par une synthèse vocale.

DATE DU JOUR: nous sommes ${dateDuJourQuebec()}, heure du Québec.
- C'est la date réelle d'aujourd'hui. Ta mémoire d'entraînement est plus ancienne : ne suppose jamais qu'on est encore dans une année antérieure.
- Pour tout ce qui bouge dans le temps (sport, saison en cours, actualité, élections, sorties, événements), raisonne à partir de cette date.
- Si tu as l'outil de recherche web, sers-t'en pour ces sujets plutôt que de répondre de mémoire.

Tu as une excellente connaissance générale du monde, de l'actualité récente, des émissions de télévision québécoises et des films disponibles sur les plateformes canadiennes.

RÈGLES ABSOLUES POUR LA VOIX:
- Écris exactement comme tu parlerais à voix haute — jamais comme un texte
- Phrases courtes, virgules et points pour créer des pauses naturelles
- Jamais de tirets, astérisques, listes, guillemets, parenthèses, hashtags
- Jamais de "Premièrement", "Deuxièmement" ni de numéros
- Si tu dois énumérer: "il y a d'abord... ensuite... et finalement..."
- COMMENCE TOUJOURS directement par l'information — jamais par "Voilà", "Bien sûr", "Laissez-moi", "Certainement", "D'accord", "Absolument" ou toute phrase d'introduction

LONGUEUR:
- Conversation normale: 2 à 3 phrases, jamais plus de 60 mots
- Météo, télé, films, voyage: 5 à 7 phrases naturellement enchaînées
- Nouvelles: 2 phrases par nouvelle, avec un fil conducteur naturel
- Toujours terminer par une question ou invitation à continuer

PERSONNALITÉ:
- Chaleureuse, joyeuse, patiente, un brin espiègle
- Tu vouvoies toujours avec douceur
- Expressions québécoises naturelles, pas exagérées
- Tu t'intéresses vraiment à la personne

MÉTÉO:
- Termine toujours la météo en disant si c'est une bonne journée pour sortir dehors ou s'il vaut mieux rester à l'intérieur
- Tiens compte du froid, de la pluie, du vent et de la glace, et nomme le meilleur moment de la journée pour prendre l'air

LIMITES:
- Aucun conseil médical — suggère toujours un médecin
- En cas d'urgence: rappelle le 911 ou la famille
- INTERDIT ABSOLU: Ne jamais dire que tu n'as pas accès aux nouvelles. Ne jamais mentionner Radio-Canada. Ne jamais t'excuser sur tes limites. Tu DOIS donner des nouvelles concrètes sur l'Europe, le monde, le Canada — même si elles datent de quelques heures. Des nouvelles imparfaites valent mieux que le silence.${profilContexte}`;
}

const MAX_TOKENS = {
  nouvelles: 1500,
  voyage:    900,
  meteo:     900,
  f1:        900,
  ancetres:  800,
  activites: 900,
  tele:      900,
  films:     900
};

// Marqueurs qui trahissent une question ancree dans le present. Le client ne
// peut pas les detecter de facon fiable : la reconnaissance vocale transcrit
// « F1 » de dix facons, et une liste de mots-cles par sujet est sans fin.
const MARQUEURS_TEMPORELS = [
  "aujourd'hui", 'aujourdhui', 'ce matin', 'cet apres-midi', 'ce soir', 'cette nuit',
  'hier', 'avant-hier', 'demain', 'apres-demain',
  'cette semaine', 'cette fin de semaine', 'ce week-end', 'ce weekend',
  'semaine prochaine', 'semaine derniere', 'semaine passee',
  'ce mois', 'mois prochain', 'mois dernier', 'mois passe',
  'cette annee', 'annee prochaine', 'annee derniere', 'an prochain', 'an dernier',
  'en ce moment', 'actuellement', 'presentement', 'maintenant', 'en cours',
  'recemment', 'recent', 'recente', 'derniers jours', 'ces jours-ci',
  'prochain', 'prochaine', 'dernier', 'derniere',
  'qui a gagne', 'qui gagne', 'resultat', 'classement', 'score',
  'actualite', 'quoi de neuf', 'cette saison', 'saison en cours',
  'calendrier', 'horaire', 'combien coute', 'meteo', 'temperature', 'prevision'
];

function sansAccents(s) {
  return String(s == null ? '' : s).toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** La question porte-t-elle sur quelque chose qui bouge dans le temps ? */
function questionSensibleAuTemps(messages) {
  const derniers = (messages || []).slice(-2)
    .filter(m => m && m.role === 'user' && typeof m.content === 'string');
  if (!derniers.length) return false;
  const texte = sansAccents(derniers.map(m => m.content).join(' '));
  if (/\b(19|20)\d{2}\b/.test(texte)) return true;          // une annee est citee
  return MARQUEURS_TEMPORELS.some(m => texte.indexOf(m) !== -1);
}

function jsonResponse(objet, statut) {
  return new Response(JSON.stringify(objet), {
    status: statut || 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const { messages, profil, type, introSeulement, stream } = await req.json();

    // MODE INTRO : phrase rapide sans recherche web
    if (introSeulement) {
      const prenom = (profil && profil.prenom) ? profil.prenom : '';
      const intros = {
        'meteo':     `Je cherche la météo pour vous${prenom ? ', ' + prenom : ''} !`,
        'nouvelles': `Je cherche les dernières nouvelles${prenom ? ', ' + prenom : ''} !`,
        'tele':      `Je regarde les émissions de ce soir${prenom ? ', ' + prenom : ''} !`,
        'films':     `Je cherche de beaux films pour vous${prenom ? ', ' + prenom : ''} !`,
        'activites': `Je cherche des activités${prenom ? ' pour vous, ' + prenom : ''} !`,
        'default':   `Laissez-moi chercher ça pour vous${prenom ? ', ' + prenom : ''} !`
      };
      return jsonResponse({
        content: [{ type: 'text', text: intros[type] || intros['default'] }],
        introOnly: true
      });
    }

    // Recherche web : soit le type l'exige, soit la question est ancree dans
    // le present. Sans ca, Sofia repondait de memoire et se trompait d'annee.
    const typeAvecRecherche = (type === 'meteo') || (type === 'f1') || (type === 'nouvelles');
    const besoinWebSearch = typeAvecRecherche || questionSensibleAuTemps(messages);
    if (besoinWebSearch && !typeAvecRecherche) {
      console.log('Recherche web activee par detection temporelle');
    }

    const requestBody = {
      model: 'claude-sonnet-4-6',
      max_tokens: MAX_TOKENS[type] || (besoinWebSearch ? 900 : 500),
      temperature: 0.7,
      system: construireSystemPrompt(profil),
      messages: (messages || []).slice(-20)
    };
    if (stream) requestBody.stream = true;

    if (besoinWebSearch) {
      requestBody.tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }];
    }

    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    };
    if (besoinWebSearch) headers['anthropic-beta'] = 'web-search-2025-03-05';

    const reponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    if (!reponse.ok) {
      const detail = await reponse.text();
      console.log('Anthropic erreur:', reponse.status, detail.slice(0, 400));
      return jsonResponse({ error: 'anthropic_' + reponse.status }, 502);
    }

    // ---------- MODE FLUX ----------
    if (stream && reponse.body) {
      return new Response(fluxTexteSeul(reponse.body), {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-store',
          'X-Accel-Buffering': 'no'
        }
      });
    }

    // ---------- MODE JSON (repli) ----------
    const data = await reponse.json();
    if (data.content && data.content.length > 0) {
      const texteFinal = data.content
        .filter(b => b.type === 'text')
        .map(b => b.text)
        .join('')
        .replace(/\s+/g, ' ')
        .trim();
      if (texteFinal.length > 0) {
        return jsonResponse({ content: [{ type: 'text', text: texteFinal }] });
      }
    }
    return jsonResponse(data);

  } catch (error) {
    console.log('Chat error:', error.message);
    return jsonResponse({ error: error.message }, 500);
  }
};

/**
 * Transforme le flux SSE d'Anthropic en un simple flux de texte.
 * On ne retient que les text_delta : les blocs de recherche web sont ignorés,
 * exactement comme le faisait le filtre b.type === 'text' en mode JSON.
 */
function fluxTexteSeul(corpsAmont) {
  const encodeur = new TextEncoder();
  const decodeur = new TextDecoder();

  return new ReadableStream({
    async start(controller) {
      const lecteur = corpsAmont.getReader();
      let tampon = '';
      try {
        for (;;) {
          const { done, value } = await lecteur.read();
          if (done) break;
          tampon += decodeur.decode(value, { stream: true });

          let saut;
          while ((saut = tampon.indexOf('\n')) !== -1) {
            const ligne = tampon.slice(0, saut).trim();
            tampon = tampon.slice(saut + 1);
            if (!ligne.startsWith('data:')) continue;

            const charge = ligne.slice(5).trim();
            if (!charge || charge === '[DONE]') continue;

            let ev;
            try { ev = JSON.parse(charge); } catch { continue; }

            if (ev.type === 'content_block_delta' && ev.delta && ev.delta.type === 'text_delta') {
              controller.enqueue(encodeur.encode(ev.delta.text));
            } else if (ev.type === 'error') {
              console.log('Flux Anthropic erreur:', JSON.stringify(ev.error || {}));
            }
          }
        }
      } catch (e) {
        console.log('Flux interrompu:', e.message);
      } finally {
        try { lecteur.releaseLock(); } catch {}
        controller.close();
      }
    }
  });
}
