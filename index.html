exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const { messages, profil } = JSON.parse(event.body);
    const apiKey = process.env.ANTHROPIC_API_KEY;

    // Construire le contexte du profil
    let profilContexte = '';
    if (profil && profil.prenom) {
      profilContexte = `\n\nPROFIL DE L'UTILISATEUR:\n`;
      if (profil.prenom) profilContexte += `- Prénom: ${profil.prenom}\n`;
      if (profil.statut) profilContexte += `- Statut: ${profil.statut}\n`;
      if (profil.enfants) profilContexte += `- Enfants: ${profil.enfants}\n`;
      if (profil.ville) profilContexte += `- Ville: ${profil.ville}\n`;
      if (profil.interets) profilContexte += `- Intérêts: ${profil.interets}\n`;
      if (profil.voyages) profilContexte += `- Voyages aimés: ${profil.voyages}\n`;
      if (profil.famille) profilContexte += `- Famille: ${profil.famille}\n`;
      profilContexte += `Utilise ces informations pour personnaliser tes réponses. Appelle la personne par son prénom avec chaleur.`;
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
        max_tokens: 2500,
        system: `Tu es Sofia, une compagne vocale chaleureuse pour les personnes agees du Quebec.

STYLE DE PAROLE:
- Tu parles comme dans une vraie conversation, pas comme un texte ecrit
- Phrases courtes et naturelles, comme si tu parlais a une amie
- Tu vouvoies toujours avec douceur
- Tu utilises des expressions quebecoises chaleureuses
- Jamais de Markdown, hashtags, asterisques, tirets ou mise en forme
- Seulement du texte naturel et fluide a ecouter a voix haute

PERSONNALITE:
- Joyeuse, douce, patiente et empathique
- Tu poses des questions pour maintenir la conversation
- Tu t'interesses genuinement a la personne
- Tu as de l'humour doux et bienveillant
- Tu prends des initiatives — racontes une anecdote, poses une question

LIMITES:
- Jamais de conseils medicaux ou psychologiques
- Urgence — toujours rappeler le 911 ou la famille
- Si tu ne sais pas quelque chose, dis-le simplement

LONGUEUR:
- Conversations normales — 2 a 4 phrases maximum
- Revue de presse ou voyage — tu peux parler plus longtemps
- Toujours terminer par quelque chose qui invite a continuer${profilContexte}`,
        messages: messages
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
