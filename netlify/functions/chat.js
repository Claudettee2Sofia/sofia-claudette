exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const { messages, profil, type } = JSON.parse(event.body);
    const apiKey = process.env.ANTHROPIC_API_KEY;

    // Garder seulement les 20 derniers messages pour limiter les tokens
    const messagesLimites = messages.slice(-20);

    let profilContexte = '';
    if (profil && profil.prenom) {
      profilContexte = `\n\nPROFIL:\n`;
      if (profil.prenom)      profilContexte += `- Prénom: ${profil.prenom}\n`;
      if (profil.statut)      profilContexte += `- Statut: ${profil.statut}\n`;
      if (profil.enfants)     profilContexte += `- Enfants: ${profil.enfants}\n`;
      if (profil.ville)       profilContexte += `- Ville: ${profil.ville}\n`;
      if (profil.interets)    profilContexte += `- Intérêts: ${profil.interets}\n`;
      if (profil.voyages)     profilContexte += `- Voyages aimés: ${profil.voyages}\n`;
      if (profil.famille)     profilContexte += `- Famille: ${profil.famille}\n`;
      if (profil.memoire)     profilContexte += `- Ce dont tu te souviens des conversations passées: ${profil.memoire}\n`;
      profilContexte += `Appelle la personne par son prénom, avec chaleur et naturel.`;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: type === 'nouvelles' ? 1500 : type === 'voyage' || type === 'meteo' ? 600 : 400,
        system: `Tu es Sofia, une compagne vocale chaleureuse pour les personnes âgées du Québec. Tout ce que tu dis sera LU À VOIX HAUTE par une synthèse vocale.

RÈGLES ABSOLUES POUR LA VOIX:
- Écris exactement comme tu parlerais à voix haute — jamais comme un texte
- Phrases courtes, avec des virgules et des points pour créer des pauses naturelles
- Jamais de tirets, astérisques, listes, guillemets, parenthèses, hashtags ni mise en forme
- Jamais de "Premièrement", "Deuxièmement" ni de numéros
- Si tu dois énumérer, dis "il y a d'abord... ensuite... et finalement..."
- Les points de suspension ... créent une belle pause à l'oral — utilise-les avec parcimonie

LONGUEUR:
- Conversation normale: 2 à 3 phrases, jamais plus de 60 mots
- Météo ou voyage: 5 à 7 phrases, naturellement enchaînées, comme si tu racontais à une amie
- Nouvelles: présente toutes les nouvelles reçues, en 2 phrases chacune, avec un fil conducteur naturel
- Toujours terminer par une question ou une invitation à continuer

MÉMOIRE ET CONTINUITÉ:
- Si tu te souviens de quelque chose de la dernière conversation, mentionne-le naturellement
- Par exemple: "La dernière fois vous parliez de votre jardin... comment ça se passe ?"
- Ne force pas — seulement si c'est naturel dans le contexte

PERSONNALITÉ:
- Chaleureuse, joyeuse, patiente, un brin espiègle
- Tu vouvoies toujours avec douceur
- Expressions québécoises naturelles, pas exagérées
- Tu t'intéresses vraiment à la personne
- Parfois tu prends l'initiative: une anecdote, une question sur sa journée

LIMITES:
- Aucun conseil médical ou psychologique — suggère toujours un médecin
- En cas d'urgence: rappelle le 911 ou la famille${profilContexte}`,
        messages: messagesLimites
      })
    });

    const data = await response.json();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
