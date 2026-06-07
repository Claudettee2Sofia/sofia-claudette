exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const { text } = JSON.parse(event.body);
    const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/WW0JfNPk5DgcQdM0d6X6', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: { stability: 0.6, similarity_boost: 0.8, speed: 0.85 }
      })
    });
    const audioBuffer = await response.arrayBuffer();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'audio/mpeg' },
      body: Buffer.from(audioBuffer).toString('base64'),
      isBase64Encoded: true
    };
  } catch (error) {
    console.log('Voice error:', error.message);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
