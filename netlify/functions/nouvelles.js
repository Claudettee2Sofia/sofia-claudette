exports.handler = async function(event) {
  try {
    const response = await fetch('https://ici.radio-canada.ca/rss/4159', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const xml = await response.text();
    
    // Extraire les titres et descriptions du RSS
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    const titleRegex = /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/;
    const descRegex = /<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/;
    
    let match;
    while ((match = itemRegex.exec(xml)) !== null && items.length < 6) {
      const itemXml = match[1];
      const titleMatch = titleRegex.exec(itemXml);
      const descMatch = descRegex.exec(itemXml);
      if (titleMatch) {
        items.push({
          titre: (titleMatch[1] || titleMatch[2] || '').trim(),
          description: (descMatch ? (descMatch[1] || descMatch[2] || '') : '').replace(/<[^>]*>/g, '').trim().substring(0, 150)
        });
      }
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
