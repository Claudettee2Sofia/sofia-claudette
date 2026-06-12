exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const { text } = JSON.parse(event.body);

    // Nettoyer le texte pour une meilleure synthèse
    const textePropre = text
      .replace(/["""«»]/g, '')          // guillemets parasites
      .replace(/\s{2,}/g, ' ')          // espaces multiples
      .trim();

    const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/WeAAwKYcS06VmXw086yZ', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text: textePropre,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: {
          stability: 0.65,
          similarity_boost: 0.75,
          style: 0.35,
          use_speaker_boost: true,
          speed: 1.0
        }
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error('ElevenLabs: ' + err);
    }

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
