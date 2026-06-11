exports.handler = async function(event) {
  try {
    const body = JSON.parse(event.body || '{}');
    const destination = body.destination || '';

    if (!destination) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ erreur: 'Destination manquante' })
      };
    }

    // Météo de la destination
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destination)}&count=1&language=fr&format=json`;
    const geoResponse = await fetch(geoUrl);
    const geoData = await geoResponse.json();

    let meteo = null;
    let nomVille = destination;
    let pays = '';

    if (geoData.results && geoData.results.length > 0) {
      const lieu = geoData.results[0];
      nomVille = lieu.name;
      pays = lieu.country;
      const lat = lieu.latitude;
      const lon = lieu.longitude;

      const meteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=3`;
      const meteoResponse = await fetch(meteoUrl);
      const meteoData = await meteoResponse.json();

      const codes = {
        0:'ciel dégagé',1:'principalement dégagé',2:'partiellement nuageux',3:'couvert',
        45:'brouillard',61:'pluie légère',63:'pluie modérée',65:'pluie forte',
        71:'neige légère',73:'neige modérée',75:'neige forte',
        80:'averses légères',81:'averses modérées',95:'orage'
      };

      meteo = {
        temperature: Math.round(meteoData.current.temperature_2m),
        description: codes[meteoData.current.weather_code] || 'conditions variables',
        max: Math.round(meteoData.daily.temperature_2m_max[0]),
        min: Math.round(meteoData.daily.temperature_2m_min[0])
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        destination: nomVille,
        pays: pays,
        meteo: meteo
      })
    };
  } catch(error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
