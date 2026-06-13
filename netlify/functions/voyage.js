exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const { destination, type } = JSON.parse(event.body);
    const WEATHER_KEY = process.env.OPENWEATHER_API_KEY;
    const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY;

    // === MODE PHOTOS VILLAGE ===
    if (type === 'photos') {
      const resultat = { photos: [] };
      try {
        const photoRes = await fetch(
          `https://api.unsplash.com/search/photos?query=${encodeURIComponent(destination + ' village')}&per_page=3&orientation=landscape`,
          { headers: { 'Authorization': 'Client-ID ' + UNSPLASH_KEY } }
        );
        const photoData = await photoRes.json();
        if (photoData.results) {
          resultat.photos = photoData.results.map(function(p) {
            return {
              url: p.urls.regular,
              description: p.alt_description || destination,
              credit: p.user.name
            };
          });
        }
      } catch(e) {}
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resultat)
      };
    }

    // === MODE DESTINATION COMPLÈTE ===
    const resultat = {};

    // MÉTÉO
    try {
      const meteoRes = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(destination)}&appid=${WEATHER_KEY}&units=metric&lang=fr`
      );
      const meteoData = await meteoRes.json();
      if (meteoData.main) {
        resultat.meteo = {
          temperature: Math.round(meteoData.main.temp),
          description: meteoData.weather[0].description,
          max: Math.round(meteoData.main.temp_max),
          min: Math.round(meteoData.main.temp_min),
          humidite: meteoData.main.humidity,
          vent: Math.round(meteoData.wind.speed * 3.6)
        };
        resultat.destination = meteoData.name;
        resultat.pays = meteoData.sys.country;
        const offsetHeures = meteoData.timezone / 3600;
        const offsetQc = -4;
        const diff = offsetHeures - offsetQc;
        resultat.decalage = diff > 0 ? '+' + diff + 'h vs Québec' : diff + 'h vs Québec';
      }
    } catch(e) {}

    // PHOTO PRINCIPALE
    try {
      const photoRes = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(destination + ' travel landscape')}&per_page=1&orientation=landscape`,
        { headers: { 'Authorization': 'Client-ID ' + UNSPLASH_KEY } }
      );
      const photoData = await photoRes.json();
      if (photoData.results && photoData.results.length > 0) {
        resultat.photo = {
          url: photoData.results[0].urls.regular,
          description: photoData.results[0].alt_description || destination,
          credit: photoData.results[0].user.name
        };
      }
    } catch(e) {}

    // INFOS PRATIQUES
    try {
      const infoRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 500,
          messages: [{
            role: 'user',
            content: `Pour la destination "${destination}", donne-moi en JSON uniquement (sans markdown) :
{
  "visa": "info visa pour Canadiens en 1 phrase courte",
  "monnaie": "nom et symbole de la monnaie",
  "langue": "langue principale",
  "meilleure_saison": "meilleure période pour visiter en 1 phrase",
  "villages": ["village ou lieu incontournable 1", "village ou lieu incontournable 2", "village ou lieu incontournable 3"],
  "route": "suggestion de route en 2-3 phrases pour visiter les plus beaux endroits",
  "conseils": "1 conseil pratique important en 1 phrase"
}`
          }]
        })
      });
      const infoData = await infoRes.json();
      if (infoData.content && infoData.content[0]) {
        const text = infoData.content[0].text.replace(/```json|```/g, '').trim();
        resultat.infos = JSON.parse(text);
      }
    } catch(e) {}

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(resultat)
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
