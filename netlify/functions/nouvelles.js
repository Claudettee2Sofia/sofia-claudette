exports.handler = async function(event) {
  try {
    const sources = [
      { url: 'https://ici.radio-canada.ca/rss/4159', nom: 'Radio-Canada' },
      { url: 'https://ici.radio-canada.ca/rss/6048', nom: 'Radio-Canada Arts' },
      { url: 'https://ici.radio-canada.ca/rss/4172', nom: 'Radio-Canada Culture' },
{ url: 'https://www.tvanouvelles.ca/rss', nom: 'TVA Nouvelles' }
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
        while ((match = itemRegex.exec(xml)) !== null && count < 4) {
          const itemXml = match[1];
          const titleMatch = titleRegex.exec(itemXml);
          const descMatch = descRegex.exec(itemXml);
          if (titleMatch) {
            items.push({
              titre: (titleMatch[1] || titleMatch[2] || '').trim(),
              description: (descMatch ? (descMatch[1] || descMatch[2] || '') : '').replace(/<[^>]*>/g, '').trim().substring(0, 150),
              source: source.nom
            });
            count++;
          }
        }
      } catch(e) {}
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articles: items })
    };
  } catch(error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
