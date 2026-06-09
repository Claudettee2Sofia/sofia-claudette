exports.handler = async function(event) {
  try {
    const sources = [
      { url: 'https://ici.radio-canada.ca/rss/4159', nom: 'Radio-Canada', max: 5 },
      { url: 'https://ici.radio-canada.ca/rss/6048', nom: 'RC Arts', max: 4 },
      { url: 'https://ici.radio-canada.ca/rss/4172', nom: 'RC Culture', max: 4 },
     { url: 'https://www.tvanouvelles.ca/rss.xml', nom: 'TVA Nouvelles', max: 4 },
{ url: 'https://www.france24.com/fr/rss', nom: 'France 24', max: 3 },
{ url: 'https://fr.euronews.com/rss', nom: 'Euronews', max: 3 }Sonnet 4.6 Moyen
      { url: 'https://www.lapresse.ca/actualites/rss', nom: 'La Presse', max: 4 },
      { url: 'https://www.lapresse.ca/arts/rss', nom: 'La Presse Arts', max: 3 }
    ];

    const items = [];

    for (const source of sources) {
      try {
        const response = await fetch(source.url, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const xml = await response.text();
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        const titleRegex = /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/;
        const descRegex = /<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/;

        let match;
        let count = 0;
        while ((match = itemRegex.exec(xml)) !== null && count < source.max) {
          const itemXml = match[1];
          const titleMatch = titleRegex.exec(itemXml);
          const descMatch = descRegex.exec(itemXml);
          if (titleMatch) {
            const titre = (titleMatch[1] || titleMatch[2] || '').trim();
            if (titre.length > 5) {
              items.push({
                titre: titre,
                description: (descMatch ? (descMatch[1] || descMatch[2] || '') : '').replace(/<[^>]*>/g, '').trim().substring(0, 200),
                source: source.nom
              });
              count++;
            }
          }
        }
      } catch(e) {
        console.log('Source failed:', source.nom, e.message);
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articles: items, total: items.length })
    };
  } catch(error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
