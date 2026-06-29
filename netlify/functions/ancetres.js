exports.handler = async function(event) {
  try {
    const body = JSON.parse(event.body || '{}');
    const action = body.action || 'ressources';

    // === ACTION : RESSOURCES DE BASE ===
    if (action === 'ressources') {
      const nom = body.nom || '';
      const sources = [
        { nom: 'BAnQ', url: 'https://www.banq.qc.ca/archives/genealogie/', description: 'Registres paroissiaux, actes d\'état civil, recensements du Québec' },
        { nom: 'Généalogie Québec (Institut Drouin)', url: 'https://www.genealogiequebec.com', description: 'Plus de 100 millions de données généalogiques québécoises' },
        { nom: 'PRDH', url: 'https://www.prdh-igd.com', description: 'Registre de la population du Québec ancien, 1621-1849' },
        { nom: 'FamilySearch', url: 'https://www.familysearch.org', description: 'Base de données gratuite avec archives numérisées pour le Québec' },
        { nom: 'Nos Origines', url: 'https://www.nosorigines.qc.ca', description: 'Arbre généalogique gratuit du Québec et d\'Amérique française' },
        { nom: 'Fichier Origine', url: 'https://www.fichierorigine.com', description: 'Origines des fondateurs du Québec, provinces françaises d\'origine' }
      ];
      const conseils = [
        'Commencez par rassembler les documents familiaux — actes de baptême, mariage, décès',
        'Interrogez les membres plus âgés de votre famille — ils ont souvent des informations précieuses',
        'Les registres paroissiaux québécois remontent souvent jusqu\'au 17e siècle',
        'Le nom de jeune fille de votre mère est essentiel pour remonter la lignée maternelle',
        'Les recensements canadiens de 1851 à 1921 sont disponibles gratuitement en ligne',
        'Beaucoup de familles québécoises ont des ancêtres fondateurs arrivés entre 1634 et 1663'
      ];

      // Flux RSS actualités généalogie
      const actualites = [];
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const response = await fetch('https://www.genealogiequebec.com/blog/fr/feed/', {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Sofia/1.0)' },
          signal: controller.signal
        });
        clearTimeout(timeout);
        if (response.ok) {
          const xml = await response.text();
          const itemRegex = /<item>([\s\S]*?)<\/item>/g;
          const titleRegex = /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/;
          let match; let count = 0;
          while ((match = itemRegex.exec(xml)) !== null && count < 2) {
            const titleMatch = titleRegex.exec(match[1]);
            if (titleMatch) {
              const titre = (titleMatch[1] || titleMatch[2] || '').trim();
              if (titre.length > 5) { actualites.push({ titre, source: 'Généalogie Québec' }); count++; }
            }
          }
        }
      } catch(e) { console.log('RSS échoué:', e.message); }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom, sources, conseils, actualites })
      };
    }

    // === ACTION : RECHERCHE FAMILYSEARCH ===
    if (action === 'rechercher') {
      const personne = body.personne || {};
      const resultats = [];
      const suggestions = [];

      // Construire les liens de recherche directs
      const prenom = personne.prenom || '';
      const nomFamille = personne.nom || '';
      const prenomPere = personne.pere_prenom || '';
      const nomPere = personne.pere_nom || '';
      const prenomMere = personne.mere_prenom || '';
      const nomMere = personne.mere_nom || '';
      const region = personne.region || 'Quebec';
      const epoque = personne.epoque || '';

      // Lien FamilySearch direct
      let urlFamilySearch = 'https://www.familysearch.org/search/record/results?q.givenName=' + encodeURIComponent(prenom) + '&q.surname=' + encodeURIComponent(nomFamille);
      if (prenomPere) urlFamilySearch += '&q.fatherGivenName=' + encodeURIComponent(prenomPere);
      if (nomPere) urlFamilySearch += '&q.fatherSurname=' + encodeURIComponent(nomPere);
      if (prenomMere) urlFamilySearch += '&q.motherGivenName=' + encodeURIComponent(prenomMere);
      if (nomMere) urlFamilySearch += '&q.motherSurname=' + encodeURIComponent(nomMere);
      urlFamilySearch += '&q.residencePlace=' + encodeURIComponent(region);

      // Lien BAnQ
      let urlBAnQ = 'https://www.banq.qc.ca/archives/genealogie/';

      // Lien Nos Origines
      let urlNosOrigines = 'https://www.nosorigines.qc.ca/GenealogieQuebec.aspx?nom=' + encodeURIComponent(nomFamille) + '&prenom=' + encodeURIComponent(prenom) + '&langue=fr';

      // Lien Généalogie Québec
      let urlGenQc = 'https://www.genealogiequebec.com/en/search#';

      resultats.push({
        source: 'FamilySearch',
        url: urlFamilySearch,
        description: 'Recherche directe dans les archives pour ' + prenom + ' ' + nomFamille
      });
      resultats.push({
        source: 'Nos Origines',
        url: urlNosOrigines,
        description: 'Arbre généalogique gratuit — famille ' + nomFamille
      });
      resultats.push({
        source: 'Généalogie Québec',
        url: urlGenQc,
        description: 'Plus de 100 millions de documents — famille ' + nomFamille
      });
      resultats.push({
        source: 'BAnQ',
        url: urlBAnQ,
        description: 'Archives nationales du Québec — registres paroissiaux'
      });

      // Générer des suggestions de recherche personnalisées
      if (nomFamille) {
        suggestions.push('Cherchez "' + nomFamille + '" dans les registres paroissiaux de ' + region);
        if (prenomPere && nomPere) suggestions.push('Recherchez le mariage de ' + prenomPere + ' ' + nomPere + ' pour trouver vos grands-parents paternels');
        if (prenomMere && nomMere) suggestions.push('Le nom de jeune fille "' + nomMere + '" est la clé pour remonter la lignée maternelle');
        if (epoque) suggestions.push('Concentrez-vous sur les registres de la période ' + epoque + ' dans la région ' + region);
        suggestions.push('FamilySearch propose des archives numérisées gratuites — commencez par là');
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personne,
          resultats,
          suggestions
        })
      };
    }

    return {
      statusCode: 400,
      body: JSON.stringify({ erreur: 'Action inconnue' })
    };

  } catch(error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
