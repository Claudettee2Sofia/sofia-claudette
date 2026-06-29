exports.handler = async function(event) {
  try {
    const body = JSON.parse(event.body || '{}');
    const nom = body.nom || '';
    const prenom = body.prenom || '';
    const region = body.region || 'Quebec';

    const sources = [
      {
        nom: 'BAnQ — Bibliothèque et Archives nationales du Québec',
        url: 'https://www.banq.qc.ca/archives/genealogie/',
        description: 'Registres paroissiaux, actes d\'état civil, recensements du Québec'
      },
      {
        nom: 'Genealogy Quebec (Institut Drouin)',
        url: 'https://www.genealogiequebec.com',
        description: 'Plus de 100 millions de données généalogiques québécoises'
      },
      {
        nom: 'PRDH — Programme de recherche en démographie historique',
        url: 'https://www.prdh-igd.com',
        description: 'Registre de la population du Québec ancien, 1621-1849'
      },
      {
        nom: 'Fichier Origine',
        url: 'https://www.fichierorigine.com',
        description: 'Origines des fondateurs du Québec, provinces françaises d\'origine'
      },
      {
        nom: 'FamilySearch',
        url: 'https://www.familysearch.org',
        description: 'Base de données gratuite avec archives numérisées pour le Québec'
      },
      {
        nom: 'Nos Origines',
        url: 'https://www.nosorigines.qc.ca',
        description: 'Base de données gratuite et sans inscription — arbres généalogiques du Québec'
      }
    ];

    const conseils = [
      'Commencez par rassembler les documents familiaux — actes de baptême, mariage, décès',
      'Interrogez les membres plus âgés de votre famille — ils ont souvent des informations précieuses',
      'Les registres paroissiaux québécois remontent souvent jusqu\'au 17e siècle',
      'Le nom de jeune fille de votre mère est essentiel pour remonter la lignée maternelle',
      'Les recensements canadiens de 1851 à 1921 sont disponibles gratuitement en ligne',
      'Beaucoup de familles québécoises ont des ancêtres fondateurs arrivés entre 1634 et 1663'
    ];

    // === FLUX RSS GÉNÉALOGIE ===
    const actualites = [];

    const fluxRSS = [
      {
        url: 'https://www.genealogiequebec.com/blog/fr/feed/',
        source: 'Généalogie Québec'
      },
      {
        url: 'https://genealogyensemble.com/feed',
        source: 'Généalogie Ensemble'
      }
    ];

    for (const flux of fluxRSS) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(flux.url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Sofia/1.0)' },
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (!response.ok) continue;

        const xml = await response.text();
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        const titleRegex = /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/;
        const descRegex = /<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/;

        let match;
        let count = 0;
        while ((match = itemRegex.exec(xml)) !== null && count < 3) {
          const itemXml = match[1];
          const titleMatch = titleRegex.exec(itemXml);
          const descMatch = descRegex.exec(itemXml);
          if (titleMatch) {
            const titre = (titleMatch[1] || titleMatch[2] || '').trim();
            if (titre.length > 5) {
              actualites.push({
                titre: titre,
                description: descMatch
                  ? (descMatch[1] || descMatch[2] || '').replace(/<[^>]*>/g, '').trim().substring(0, 200)
                  : '',
                source: flux.source
              });
              count++;
            }
          }
        }
      } catch(e) {
        console.log('Flux RSS échoué:', flux.source, e.message);
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nom: nom,
        prenom: prenom,
        region: region,
        sources: sources,
        conseils: conseils,
        actualites: actualites
      })
    };

  } catch(error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
