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
        nom: 'Genealogy Quebec',
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
        nom: 'Ancestry',
        url: 'https://www.ancestry.ca',
        description: 'Base de données mondiale avec millions de documents québécois'
      }
    ];

    const conseils = [
      'Commencez par rassembler les documents familiaux — actes de baptême, mariage, décès',
      'Interrogez les membres plus âgés de votre famille — ils ont souvent des informations précieuses',
      'Les registres paroissiaux québécois remontent souvent jusqu\'au 17e siècle',
      'Le nom de jeune fille de votre mère est essentiel pour remonter la lignée maternelle',
      'Les recensements canadiens de 1851 à 1921 sont disponibles gratuitement en ligne',
      'Beaucoup de familles québécoises ont des ancêtres fondateurs qui sont arrivés entre 1634 et 1663'
    ];

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nom: nom,
        prenom: prenom,
        region: region,
        sources: sources,
        conseils: conseils
      })
    };
  } catch(error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
