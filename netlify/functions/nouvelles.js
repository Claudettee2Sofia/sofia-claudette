exports.handler = async function(event) {
  try {
    const sources = [
      { url: 'https://ici.radio-canada.ca/rss/4159', nom: 'Radio-Canada', categorie: 'quebec', max: 5 },
      { url: 'https://ici.radio-canada.ca/rss/6048', nom: 'RC Arts', categorie: 'culture', max: 4 },
      { url: 'https://ici.radio-canada.ca/rss/4172', nom: 'RC Culture', categorie: 'culture', max: 3 },
      { url: 'https://www.france24.com/fr/rss', nom: 'France 24', categorie: 'monde', max: 4 },
      { url: 'https://www.lefigaro.fr/rss/figaro_actualites.xml', nom: 'Le Figaro', categorie: 'monde', max: 3 }
    ];
    const articles = { quebec: [], monde: [], culture: [] };
    for (const source of sources) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(source.url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Sofia/1.0)' },
          signal: controller.signal
        });
        clearTimeout(timeout);
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
              articles[source.categorie].push({
                titre: titre,
                description: (descMatch ? (descMatch[1] || descMatch[2] || '') : '')
                  .replace(/<[^>]*>/g, '').trim().substring(0, 200),
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
    const tous = [...articles.quebec, ...articles.monde, ...articles.culture];
    // Si aucun article, retourner un article de secours
    if (tous.length === 0) {
      articles.quebec.push({
        titre: 'Les nouvelles sont temporairement indisponibles',
        description: 'Veuillez réessayer dans quelques minutes.',
        source: 'Sofia'
      });
    }
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        articles: tous,
        quebec: articles.quebec,
        monde: articles.monde,
        culture: articles.culture,
        total: tous.length
      })
    };
  } catch(error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
