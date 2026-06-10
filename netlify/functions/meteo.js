exports.handler = async function(event) {
  try {
    const body = JSON.parse(event.body || '{}');
    const ville = body.ville || 'Quebec';

    // Chercher les coordonnées de la ville
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(ville)}&count=1&language=fr&format=json`;
    const geoResponse = await fetch(geoUrl);
    const geoData = await geoResponse.json();

    if (!geoData.results || geoData.results.length === 0) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ erreur: 'Ville introuvable' })
      };
    }

    const lieu = geoData.results[0];
    const lat = lieu.latitude;
    const lon = lieu.longitude;
    const nomVille = lieu.name;
    const pays = lieu.country;

    // Chercher la météo
    const meteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code&timezone=auto&forecast_days=3`;
    const meteoResponse = await fetch(meteoUrl);
    const meteoData = await meteoResponse.json();

    const codes = {
      0:'ciel dégagé',1:'principalement dégagé',2:'partiellement nuageux',3:'couvert',
      45:'brouillard',48:'brouillard givrant',
      51:'bruine légère',53:'bruine modérée',55:'bruine dense',
      61:'pluie légère',63:'pluie modérée',65:'pluie forte',
      71:'neige légère',73:'neige modérée',75:'neige forte',77:'grains de neige',
      80:'averses légères',81:'averses modérées',82:'averses violentes',
      85:'averses de neige',86:'averses de neige fortes',
      95:'orage',96:'orage avec grêle',99:'orage avec forte grêle'
    };

    const current = meteoData.current;
    const daily = meteoData.daily;

    const meteo = {
      ville: nomVille,
      pays: pays,
      maintenant: {
        temperature: Math.round(current.temperature_2m),
        humidite: current.relative_humidity_2m,
        vent: Math.round(current.wind_speed_10m),
        description: codes[current.weather_code] || 'conditions variables'
      },
      aujourd_hui: {
        max: Math.round(daily.temperature_2m_max[0]),
        min: Math.round(daily.temperature_2m_min[0]),
        precipitation: daily.precipitation_sum[0],
        description: codes[daily.weather_code[0]] || 'conditions variables'
      },
      demain: {
        max: Math.round(daily.temperature_2m_max[1]),
        min: Math.round(daily.temperature_2m_min[1]),
        precipitation: daily.precipitation_sum[1],
        description: codes[daily.weather_code[1]] || 'conditions variables'
      },
      apres_demain: {
        max: Math.round(daily.temperature_2m_max[2]),
        min: Math.round(daily.temperature_2m_min[2]),
        precipitation: daily.precipitation_sum[2],
        description: codes[daily.weather_code[2]] || 'conditions variables'
      }
    };

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(meteo)
    };
  } catch(error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
