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
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  const data = await response.json();
  if (data.content && data.content[0]) return data.content[0].text;
  throw new Error('Pas de reponse de Claude');
}

exports.handler = async function(event) {
  try {
    const body = JSON.parse(event.body || '{}');
    const theme = body.theme || 'general';
    const question = body.question || '';
    const profil = body.profil || {};
    const nom = profil.prenom || 'vous';

    let prompt = '';
    let type = 'vocal'; // vocal ou ecran

    // === NUTRITION ===
    if (theme === 'nutrition') {
      type = 'ecran';
      prompt = `Tu es Sofia, une assistante chaleureuse pour aînés québécois.
Génère des conseils nutritionnels adaptés aux personnes âgées en JSON. Réponds UNIQUEMENT en JSON sans texte avant ou après:
{
  "titre": "Nutrition santé",
  "intro": "Introduction chaleureuse sur l'importance de bien manger après 70 ans en 2 phrases",
  "conseils": [
    {"titre": "Protéines", "icone": "🥩", "conseil": "Conseil pratique sur les protéines pour les aînés"},
    {"titre": "Calcium", "icone": "🥛", "conseil": "Conseil sur le calcium et les os"},
    {"titre": "Fibres", "icone": "🥦", "conseil": "Conseil sur les fibres et la digestion"},
    {"titre": "Hydratation", "icone": "💧", "conseil": "Conseil sur l'hydratation"},
    {"titre": "Vitamines", "icone": "🍊", "conseil": "Conseil sur les vitamines essentielles"}
  ],
  "recette_du_jour": {
    "nom": "Nom d'une recette simple et nutritive",
    "ingredients": ["ingrédient 1", "ingrédient 2", "ingrédient 3", "ingrédient 4"],
    "preparation": "Préparation simple en 2-3 phrases"
  },
  "aliments_a_privilegier": ["aliment 1", "aliment 2", "aliment 3", "aliment 4", "aliment 5"],
  "conseil_sofia": "Un conseil personnalisé chaleureux pour ${nom}"
}`;
    }

    // === EXERCICE ===
    else if (theme === 'exercice') {
      type = 'ecran';
      prompt = `Tu es Sofia, une assistante chaleureuse pour aînés québécois.
Génère des exercices adaptés aux personnes âgées à la maison en JSON. Réponds UNIQUEMENT en JSON sans texte avant ou après:
{
  "titre": "Exercices à la maison",
  "intro": "Introduction motivante sur l'importance de bouger après 70 ans en 2 phrases",
  "exercices": [
    {
      "nom": "Nom de l'exercice",
      "icone": "🦵",
      "duree": "5 minutes",
      "description": "Description simple et claire de l'exercice",
      "benefice": "Bénéfice principal pour la santé",
      "attention": "Précaution importante si nécessaire"
    },
    {
      "nom": "Nom de l'exercice",
      "icone": "💪",
      "duree": "3 minutes",
      "description": "Description simple et claire de l'exercice",
      "benefice": "Bénéfice principal pour la santé",
      "attention": ""
    },
    {
      "nom": "Nom de l'exercice",
      "icone": "🧘",
      "duree": "5 minutes",
      "description": "Description simple et claire de l'exercice",
      "benefice": "Bénéfice principal pour la santé",
      "attention": ""
    },
    {
      "nom": "Nom de l'exercice",
      "icone": "🚶",
      "duree": "10 minutes",
      "description": "Description simple et claire de l'exercice",
      "benefice": "Bénéfice principal pour la santé",
      "attention": ""
    },
    {
      "nom": "Nom de l'exercice",
      "icone": "⚖️",
      "duree": "5 minutes",
      "description": "Description simple et claire de l'exercice",
      "benefice": "Bénéfice principal pour la santé",
      "attention": "Faire près d'un mur pour l'équilibre"
    }
  ],
  "routine_quotidienne": "Description d'une routine quotidienne de 20-30 minutes adaptée aux aînés",
  "conseil_sofia": "Un conseil motivant et chaleureux pour ${nom}"
}`;
    }

    // === MEMOIRE ===
    else if (theme === 'memoire') {
      type = 'ecran';
      prompt = `Tu es Sofia, une assistante chaleureuse pour aînés québécois.
Génère des exercices de mémoire et conseils cognitifs en JSON. Réponds UNIQUEMENT en JSON sans texte avant ou après:
{
  "titre": "Exercices de mémoire",
  "intro": "Introduction rassurante sur la mémoire et le vieillissement en 2 phrases",
  "exercices": [
    {"nom": "Nom de l'exercice", "icone": "🧩", "description": "Description de l'exercice mental", "duree": "5 min"},
    {"nom": "Nom de l'exercice", "icone": "📖", "description": "Description de l'exercice mental", "duree": "10 min"},
    {"nom": "Nom de l'exercice", "icone": "🎵", "description": "Description de l'exercice mental", "duree": "5 min"},
    {"nom": "Nom de l'exercice", "icone": "✏️", "description": "Description de l'exercice mental", "duree": "10 min"},
    {"nom": "Nom de l'exercice", "icone": "🌿", "description": "Description de l'exercice mental", "duree": "5 min"}
  ],
  "habitudes_benefiques": [
    "Habitude bénéfique pour la mémoire 1",
    "Habitude bénéfique pour la mémoire 2",
    "Habitude bénéfique pour la mémoire 3",
    "Habitude bénéfique pour la mémoire 4"
  ],
  "signes_a_surveiller": [
    "Signe normal du vieillissement",
    "Signe qui mérite attention",
    "Signe à signaler au médecin"
  ],
  "conseil_sofia": "Un conseil bienveillant et rassurant pour ${nom}"
}`;
    }

    // === MEDICAMENTS ===
    else if (theme === 'medicaments') {
      type = 'ecran';
      prompt = `Tu es Sofia, une assistante chaleureuse pour aînés québécois.
Génère des conseils sur la gestion des médicaments pour les aînés en JSON. Réponds UNIQUEMENT en JSON sans texte avant ou après:
{
  "titre": "Gestion des médicaments",
  "intro": "Introduction sur l'importance de bien gérer ses médicaments en 2 phrases",
  "conseils": [
    {"titre": "Horaires", "icone": "⏰", "conseil": "Conseil sur les horaires de prise"},
    {"titre": "Stockage", "icone": "🏠", "conseil": "Conseil sur le stockage des médicaments"},
    {"titre": "Interactions", "icone": "⚠️", "conseil": "Conseil sur les interactions médicamenteuses"},
    {"titre": "Renouvellement", "icone": "📋", "conseil": "Conseil sur le renouvellement des ordonnances"},
    {"titre": "Questions médecin", "icone": "👨‍⚕️", "conseil": "Questions importantes à poser au médecin"}
  ],
  "astuces_pratiques": [
    "Astuce pratique 1 pour ne pas oublier ses médicaments",
    "Astuce pratique 2",
    "Astuce pratique 3",
    "Astuce pratique 4"
  ],
  "rappels_importants": [
    "Rappel important 1",
    "Rappel important 2",
    "Rappel important 3"
  ],
  "conseil_sofia": "Un conseil bienveillant pour ${nom} sur la gestion de ses médicaments"
}`;
    }

    // === THEMES VOCAUX ===
    else if (theme === 'sommeil') {
      prompt = `Tu es Sofia, une assistante chaleureuse pour aînés québécois. 
Donne des conseils pratiques et bienveillants sur le sommeil pour les personnes âgées. 
Parle directement à ${nom} de façon chaleureuse. 
Inclus: conseils pour mieux dormir, routine du soir, quand consulter un médecin. 
Sois rassurante et pratique. Maximum 150 mots.`;
      type = 'vocal';
    }

    else if (theme === 'hydratation') {
      prompt = `Tu es Sofia, une assistante chaleureuse pour aînés québécois.
Donne des conseils pratiques sur l'hydratation pour ${nom}.
Inclus: quelle quantité boire, signes de déshydratation, astuces pour boire plus. 
Sois chaleureuse et pratique. Maximum 150 mots.`;
      type = 'vocal';
    }

    else if (theme === 'tension') {
      prompt = `Tu es Sofia, une assistante chaleureuse pour aînés québécois.
Explique simplement la tension artérielle à ${nom}.
Inclus: chiffres normaux, habitudes saines, aliments à éviter, quand consulter. 
Sois rassurante et simple. Maximum 150 mots.`;
      type = 'vocal';
    }

    else if (theme === 'bien_etre') {
      prompt = `Tu es Sofia, une assistante chaleureuse pour aînés québécois.
Donne des conseils de bien-être mental et émotionnel à ${nom}.
Inclus: gestion du stress, activités relaxantes, importance du lien social, exercices de respiration simples.
Sois très chaleureuse et bienveillante. Maximum 150 mots.`;
      type = 'vocal';
    }

    else if (theme === 'dentaire') {
      prompt = `Tu es Sofia, une assistante chaleureuse pour aînés québécois.
Donne des conseils de santé bucco-dentaire adaptés aux personnes âgées à ${nom}.
Inclus: hygiène quotidienne, prothèses dentaires si applicable, signes à surveiller, fréquence des visites.
Sois pratique et bienveillante. Maximum 150 mots.`;
      type = 'vocal';
    }

    else if (theme === 'maladies') {
      const maladie = question || 'maladies courantes chez les ainés';
      prompt = `Tu es Sofia, une assistante chaleureuse pour aînés québécois.
Donne des informations claires et rassurantes sur ${maladie} à ${nom}.
Inclus: signes à surveiller, habitudes préventives, quand consulter un médecin.
IMPORTANT: Rappelle toujours de consulter un médecin pour tout diagnostic.
Sois rassurante et pratique. Maximum 200 mots.`;
      type = 'vocal';
    }

    else {
      // General
      prompt = `Tu es Sofia, une assistante chaleureuse pour aînés québécois.
${nom} a une question de santé: "${question}".
Réponds de façon chaleureuse, simple et pratique.
IMPORTANT: Rappelle toujours de consulter un médecin pour tout diagnostic ou traitement.
Maximum 200 mots.`;
      type = 'vocal';
    }

    const reponse = await appellerClaude(prompt);

    if (type === 'ecran') {
      const clean = reponse.replace(/```json|```/g, '').trim();
      try {
        const data = JSON.parse(clean);
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'ecran', theme, data })
        };
      } catch(e) {
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'vocal', theme, texte: reponse })
        };
      }
    } else {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'vocal', theme, texte: reponse })
      };
    }

  } catch(error) {
    console.log('Erreur sante:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
