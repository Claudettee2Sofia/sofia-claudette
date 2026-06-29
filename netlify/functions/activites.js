const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

async function appellerClaude(prompt) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  const data = await response.json();
  if (data.content && data.content[0]) return data.content[0].text;
  throw new Error('Pas de réponse de Claude');
}

async function lireRSS(url, max) {
  const articles = [];
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Sofia/1.0)' },
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!response.ok) return articles;
    const xml = await response.text();
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    const titleRegex = /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/;
    const descRegex = /<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/;
    const linkRegex = /<link>(.*?)<\/link>/;
    let match; let count = 0;
    while ((match = itemRegex.exec(xml)) !== null && count < max) {
      const itemXml = match[1];
      const titleMatch = titleRegex.exec(itemXml);
      const descMatch = descRegex.exec(itemXml);
      const linkMatch = linkRegex.exec(itemXml);
      if (titleMatch) {
        const titre = (titleMatch[1] || titleMatch[2] || '').trim();
        if (titre.length > 5) {
          articles.push({
            titre: titre,
            description: descMatch ? (descMatch[1] || descMatch[2] || '').replace(/<[^>]*>/g, '').trim().substring(0, 200) : '',
            lien: linkMatch ? linkMatch[1].trim() : ''
          });
          count++;
        }
      }
    }
  } catch(e) {
    console.log('RSS échoué:', url, e.message);
  }
  return articles;
}

exports.handler = async function(event) {
  try {
    const body = JSON.parse(event.body || '{}');
    const ville = body.ville || 'Québec';
    const region = body.region || 'Quebec';

    // === FLUX RSS CULTURELS ===
    const activitesRSS = [];

    // Radio-Canada Arts et Culture
    const rssArts = await lireRSS('https://ici.radio-canada.ca/rss/6048', 4);
    rssArts.forEach(function(a) { activitesRSS.push({ ...a, categorie: 'Culture et arts' }); });

    // Radio-Canada Régions selon la ville
    let rssRegion = [];
    if (ville.toLowerCase().includes('montréal') || ville.toLowerCase().includes('montreal')) {
      rssRegion = await lireRSS('https://ici.radio-canada.ca/rss/5795', 3);
    } else if (ville.toLowerCase().includes('québec') || ville.toLowerCase().includes('quebec')) {
      rssRegion = await lireRSS('https://ici.radio-canada.ca/rss/5796', 3);
    } else {
      rssRegion = await lireRSS('https://ici.radio-canada.ca/rss/4159', 3);
    }
    rssRegion.forEach(function(a) { activitesRSS.push({ ...a, categorie: 'Actualités régionales' }); });

    // === ANALYSE PAR CLAUDE ===
    let analyse = null;
    try {
      const promptClaude = `Tu es Sofia, une assistante chaleureuse pour aînés québécois. 
La personne habite à ${ville} (région ${region}).

Génère des suggestions d'activités adaptées aux aînés en JSON. Réponds UNIQUEMENT en JSON sans texte avant ou après:
{
  "activites_culturelles": [
    {"nom": "Nom de l'activité", "description": "Description courte et enthousiaste", "type": "musée/spectacle/exposition/concert"},
    {"nom": "Nom de l'activité", "description": "Description courte et enthousiaste", "type": "musée/spectacle/exposition/concert"},
    {"nom": "Nom de l'activité", "description": "Description courte et enthousiaste", "type": "musée/spectacle/exposition/concert"}
  ],
  "activites_bien_etre": [
    {"nom": "Nom de l'activité", "description": "Description courte adaptée aux aînés", "type": "sport/loisir/social"},
    {"nom": "Nom de l'activité", "description": "Description courte adaptée aux aînés", "type": "sport/loisir/social"}
  ],
  "conseil_saison": "Un conseil chaleureux sur les activités de saison à ${ville} en ce moment",
  "ressources_locales": [
    "Ressource ou organisme local pour aînés à ${ville} 1",
    "Ressource ou organisme local pour aînés à ${ville} 2"
  ]
}`;

      const reponse = await appellerClaude(promptClaude);
      const clean = reponse.replace(/```json|```/g, '').trim();
      analyse = JSON.parse(clean);
    } catch(e) {
      console.log('Erreur Claude activités:', e.message);
      analyse = {
        activites_culturelles: [
          { nom: 'Musées locaux', description: 'Visitez les musées de votre région pour découvrir l\'histoire locale', type: 'musée' },
          { nom: 'Bibliothèque municipale', description: 'Clubs de lecture, conférences et activités gratuites', type: 'loisir' }
        ],
        activites_bien_etre: [
          { nom: 'Marche en nature', description: 'Une belle façon de rester actif et de profiter de l\'air frais', type: 'sport' },
          { nom: 'Groupes communautaires', description: 'Rencontrez des gens de votre quartier', type: 'social' }
        ],
        conseil_saison: 'Profitez des belles activités de saison dans votre région !',
        ressources_locales: ['Centre communautaire local', 'CLSC de votre quartier']
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ville,
        region,
        activitesRSS,
        analyse
      })
    };

  } catch(error) {
    console.log('Erreur activites:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
