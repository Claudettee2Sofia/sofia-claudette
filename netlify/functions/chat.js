exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const { messages, profil, type, introSeulement } = JSON.parse(event.body);
    const apiKey = process.env.ANTHROPIC_API_KEY;

    const messagesLimites = messages.slice(-20);

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

    const systemPrompt = `Tu es Sofia, une compagne vocale chaleureuse pour les personnes âgées du Québec. Tout ce que tu dis sera LU À VOIX HAUTE par une synthèse vocale.

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

LIMITES:
- Aucun conseil médical — suggère toujours un médecin
- En cas d'urgence: rappelle le 911 ou la famille${profilContexte}`;

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
      const texteIntro = intros[type] || intros['default'];
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: [{ type: 'text', text: texteIntro }], introOnly: true })
      };
    }

    // Web search SEULEMENT pour la météo
    const besoinWebSearch = (type === 'meteo');

    const maxTokens = type === 'nouvelles' ? 1500
                    : type === 'voyage'    ? 900
                    : type === 'meteo'     ? 900
                    : type === 'ancetres'  ? 800
                    : type === 'activites' ? 900
                    : type === 'tele'      ? 900
                    : type === 'films'     ? 900
                    : 500;

    const requestBody = {
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: messagesLimites
    };

    if (besoinWebSearch) {
      requestBody.tools = [{
        type: 'web_search_20250305',
        name: 'web_search',
        max_uses: 2
      }];
    }

    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    };

    if (besoinWebSearch) {
      headers['anthropic-beta'] = 'web-search-2025-03-05';
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    // Assembler tous les blocs texte en une seule réponse propre
    if (data.content && data.content.length > 0) {
      const texteFinal = data.content
        .filter(b => b.type === 'text')
        .map(b => b.text)
        .join('')
        .replace(/\s+/g, ' ')
        .trim();

      if (texteFinal.length > 0) {
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: [{ type: 'text', text: texteFinal }] })
        };
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    };

  } catch (error) {
    console.log('Chat error:', error.message);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
