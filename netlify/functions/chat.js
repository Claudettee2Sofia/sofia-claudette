exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const { messages } = JSON.parse(event.body);
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        system: 'Tu es Sofia, une compagne bienveillante pour les personnes agees du Quebec. Joyeuse, douce, patiente. Tu parles en francais quebecois chaleureux. Tu vouvoies toujours. Jamais de psychologie ou medecine. Urgence: rappeler le 911. IMPORTANT: Tu reponds toujours en texte simple, sans utiliser de Markdown, sans hashtag, sans asterisques, sans tirets triples. Seulement du texte naturel et des chiffres pour les listes.',
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
