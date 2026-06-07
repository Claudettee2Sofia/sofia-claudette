exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const { messages } = JSON.parse(event.body);
    const apiKey = process.env.ANTHROPIC_API_KEY;
    console.log('API Key exists:', !!apiKey);
    console.log('API Key starts with:', apiKey ? apiKey.substring(0, 10) : 'MISSING');
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 800,
        system: 'Tu es Sofia, une compagne bienveillante pour les personnes agees. Joyeuse, douce, patiente. Phrases courtes et simples. Tu vouvoies toujours. Tu parles en francais quebecois chaleureux. Jamais de psychologie ou medecine. Urgence: rappeler le 911.',
        messages: messages
      })
    });
    const data = await response.json();
    console.log('API response status:', response.status);
    console.log('API response:', JSON.stringify(data).substring(0, 200));
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    };
  } catch (error) {
    console.log('ERROR:', error.message);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
