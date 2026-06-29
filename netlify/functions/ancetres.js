const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;

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

      // Flux RSS actualités
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

    // === ACTION : RECHERCHE ENRICHIE PAR CLAUDE ===
    if (action === 'rechercher') {
      const personne = body.personne || {};

      const prenom = personne.prenom || '';
      const nomFamille = personne.nom || '';
      const prenomPere = personne.pere_prenom || '';
      const nomPere = personne.pere_nom || '';
      const prenomMere = personne.mere_prenom || '';
      const nomMere = personne.mere_nom || '';
      const region = personne.region || 'Quebec';
      const epoque = personne.epoque || '';
      const gpPatPr = personne.gp_pat_prenom || '';
      const gpPatNom = personne.gp_pat_nom || '';
      const gmPatNom = personne.gm_pat_nom || '';
      const gpMatPr = personne.gp_mat_prenom || '';
      const gpMatNom = personne.gp_mat_nom || '';
      const gmMatNom = personne.gm_mat_nom || '';

      // Construire le prompt pour Claude
      let promptClaude = `Tu es un expert en généalogie québécoise. Analyse ces informations familiales et fournis une analyse généalogique détaillée en JSON.

Personne recherchée: ${prenom} ${nomFamille}
Région: ${region}
${epoque ? 'Époque: ' + epoque : ''}
${prenomPere || nomPere ? 'Père: ' + prenomPere + ' ' + nomPere : ''}
${prenomMere || nomMere ? 'Mère: ' + prenomMere + ' ' + nomMere : ''}
${gpPatPr || gpPatNom ? 'Grand-père paternel: ' + gpPatPr + ' ' + gpPatNom : ''}
${gmPatNom ? 'Grand-mère paternelle (nom): ' + gmPatNom : ''}
${gpMatPr || gpMatNom ? 'Grand-père maternel: ' + gpMatPr + ' ' + gpMatNom : ''}
${gmMatNom ? 'Grand-mère maternelle (nom): ' + gmMatNom : ''}

Réponds UNIQUEMENT en JSON avec cette structure exacte, sans aucun texte avant ou après:
{
  "origine_nom": "Explication de l'origine du nom de famille principal en 2-3 phrases",
  "histoire_famille": "Contexte historique probable de cette famille québécoise en 2-3 phrases",
  "paroisses_suggeres": ["Paroisse 1", "Paroisse 2", "Paroisse 3"],
  "pistes_recherche": [
    "Piste concrète 1 adaptée aux noms fournis",
    "Piste concrète 2 adaptée aux noms fournis",
    "Piste concrète 3 adaptée aux noms fournis"
  ],
  "periode_cle": "La période historique la plus importante à rechercher pour cette famille",
  "conseil_sofia": "Un conseil chaleureux et encourageant pour cette personne dans sa recherche, mentionnant les noms de famille"
}`;

      // Appel à Claude pour l'analyse
      let analyse = null;
      try {
        const reponse = await appellerClaude(promptClaude);
        const clean = reponse.replace(/```json|```/g, '').trim();
        analyse = JSON.parse(clean);
      } catch(e) {
        console.log('Erreur Claude:', e.message);
        analyse = {
          origine_nom: 'Analyse non disponible pour le moment.',
          histoire_famille: 'Veuillez réessayer dans quelques instants.',
          paroisses_suggeres: [region],
          pistes_recherche: [
            'Cherchez dans les registres paroissiaux de ' + region,
            'Consultez FamilySearch pour la famille ' + nomFamille,
            'Vérifiez BAnQ pour les actes d\'état civil'
          ],
          periode_cle: epoque || 'XIXe siècle',
          conseil_sofia: 'Je vous encourage dans votre belle recherche généalogique !'
        };
      }

      // Construire les liens de recherche
      let urlFamilySearch = 'https://www.familysearch.org/search/record/results?q.givenName=' +
        encodeURIComponent(prenom) + '&q.surname=' + encodeURIComponent(nomFamille);
      if (prenomPere) urlFamilySearch += '&q.fatherGivenName=' + encodeURIComponent(prenomPere);
      if (nomPere) urlFamilySearch += '&q.fatherSurname=' + encodeURIComponent(nomPere);
      if (prenomMere) urlFamilySearch += '&q.motherGivenName=' + encodeURIComponent(prenomMere);
      if (nomMere) urlFamilySearch += '&q.motherSurname=' + encodeURIComponent(nomMere);
      urlFamilySearch += '&q.residencePlace=' + encodeURIComponent(region);

      const urlNosOrigines = 'https://www.nosorigines.qc.ca/GenealogieQuebec.aspx?nom=' +
        encodeURIComponent(nomFamille) + '&prenom=' + encodeURIComponent(prenom) + '&langue=fr';

      const resultats = [
        {
          source: 'FamilySearch',
          url: urlFamilySearch,
          description: 'Recherche directe dans les archives pour ' + prenom + ' ' + nomFamille + ' — résultats pré-remplis'
        },
        {
          source: 'Nos Origines',
          url: urlNosOrigines,
          description: 'Arbre généalogique gratuit — famille ' + nomFamille
        },
        {
          source: 'Généalogie Québec',
          url: 'https://www.genealogiequebec.com',
          description: 'Plus de 100 millions de documents — famille ' + nomFamille
        },
        {
          source: 'BAnQ',
          url: 'https://www.banq.qc.ca/archives/genealogie/',
          description: 'Archives nationales du Québec — registres paroissiaux'
        },
        {
          source: 'Fichier Origine',
          url: 'https://www.fichierorigine.com/recherche?nom=' + encodeURIComponent(nomFamille),
          description: 'Origines des fondateurs — nom ' + nomFamille
        }
      ];

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personne,
          analyse,
          resultats
        })
      };
    }

    return {
      statusCode: 400,
      body: JSON.stringify({ erreur: 'Action inconnue' })
    };

  } catch(error) {
    console.log('Erreur ancetres:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
