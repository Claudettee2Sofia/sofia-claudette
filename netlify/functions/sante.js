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
    let type = 'vocal';

    // === NUTRITION ===
    if (theme === 'nutrition') {
      type = 'ecran';
      prompt = `Tu es Sofia, une assistante chaleureuse pour aines quebecois.
IMPORTANT: Vouvoie toujours la personne (vous, votre, vos). Ne la tutoie jamais.
Genere des conseils nutritionnels adaptes aux personnes agees en JSON. Reponds UNIQUEMENT en JSON sans texte avant ou apres:
{
  "titre": "Nutrition sante",
  "intro": "Introduction chaleureuse sur l'importance de bien manger apres 70 ans en 2 phrases en vouvoyant",
  "conseils": [
    {"titre": "Proteines", "icone": "🥩", "conseil": "Conseil pratique sur les proteines pour les aines en vouvoyant"},
    {"titre": "Calcium", "icone": "🥛", "conseil": "Conseil sur le calcium et les os en vouvoyant"},
    {"titre": "Fibres", "icone": "🥦", "conseil": "Conseil sur les fibres et la digestion en vouvoyant"},
    {"titre": "Hydratation", "icone": "💧", "conseil": "Conseil sur l'hydratation en vouvoyant"},
    {"titre": "Vitamines", "icone": "🍊", "conseil": "Conseil sur les vitamines essentielles en vouvoyant"}
  ],
  "recette_du_jour": {
    "nom": "Nom d'une recette simple et nutritive",
    "ingredients": ["ingredient 1", "ingredient 2", "ingredient 3", "ingredient 4"],
    "preparation": "Preparation simple en 2-3 phrases"
  },
  "aliments_a_privilegier": ["aliment 1", "aliment 2", "aliment 3", "aliment 4", "aliment 5"],
  "conseil_sofia": "Un conseil personnalise chaleureux pour ${nom} en la vouvoyant"
}`;
    }

    // === EXERCICE ===
    else if (theme === 'exercice') {
      type = 'ecran';
      prompt = `Tu es Sofia, une assistante chaleureuse pour aines quebecois.
IMPORTANT: Vouvoie toujours la personne (vous, votre, vos). Ne la tutoie jamais.
Genere des exercices adaptes aux personnes agees a la maison en JSON. Reponds UNIQUEMENT en JSON sans texte avant ou apres:
{
  "titre": "Exercices a la maison",
  "intro": "Introduction motivante sur l'importance de bouger apres 70 ans en 2 phrases en vouvoyant",
  "exercices": [
    {
      "nom": "Nom de l'exercice",
      "icone": "🦵",
      "duree": "5 minutes",
      "description": "Description simple et claire de l'exercice",
      "benefice": "Benefice principal pour la sante",
      "attention": "Precaution importante si necessaire"
    },
    {
      "nom": "Nom de l'exercice",
      "icone": "💪",
      "duree": "3 minutes",
      "description": "Description simple et claire de l'exercice",
      "benefice": "Benefice principal pour la sante",
      "attention": ""
    },
    {
      "nom": "Nom de l'exercice",
      "icone": "🧘",
      "duree": "5 minutes",
      "description": "Description simple et claire de l'exercice",
      "benefice": "Benefice principal pour la sante",
      "attention": ""
    },
    {
      "nom": "Nom de l'exercice",
      "icone": "🚶",
      "duree": "10 minutes",
      "description": "Description simple et claire de l'exercice",
      "benefice": "Benefice principal pour la sante",
      "attention": ""
    },
    {
      "nom": "Nom de l'exercice",
      "icone": "⚖️",
      "duree": "5 minutes",
      "description": "Description simple et claire de l'exercice",
      "benefice": "Benefice principal pour la sante",
      "attention": "Faire pres d'un mur pour l'equilibre"
    }
  ],
  "routine_quotidienne": "Description d'une routine quotidienne de 20-30 minutes adaptee aux aines en vouvoyant",
  "conseil_sofia": "Un conseil motivant et chaleureux pour ${nom} en la vouvoyant"
}`;
    }

    // === MEMOIRE ===
    else if (theme === 'memoire') {
      type = 'ecran';
      prompt = `Tu es Sofia, une assistante chaleureuse pour aines quebecois.
IMPORTANT: Vouvoie toujours la personne (vous, votre, vos). Ne la tutoie jamais.
Genere des exercices de memoire et conseils cognitifs en JSON. Reponds UNIQUEMENT en JSON sans texte avant ou apres:
{
  "titre": "Exercices de memoire",
  "intro": "Introduction rassurante sur la memoire et le vieillissement en 2 phrases en vouvoyant",
  "exercices": [
    {"nom": "Nom de l'exercice", "icone": "🧩", "description": "Description de l'exercice mental", "duree": "5 min"},
    {"nom": "Nom de l'exercice", "icone": "📖", "description": "Description de l'exercice mental", "duree": "10 min"},
    {"nom": "Nom de l'exercice", "icone": "🎵", "description": "Description de l'exercice mental", "duree": "5 min"},
    {"nom": "Nom de l'exercice", "icone": "✏️", "description": "Description de l'exercice mental", "duree": "10 min"},
    {"nom": "Nom de l'exercice", "icone": "🌿", "description": "Description de l'exercice mental", "duree": "5 min"}
  ],
  "habitudes_benefiques": [
    "Habitude benefique pour la memoire 1",
    "Habitude benefique pour la memoire 2",
    "Habitude benefique pour la memoire 3",
    "Habitude benefique pour la memoire 4"
  ],
  "signes_a_surveiller": [
    "Signe normal du vieillissement",
    "Signe qui merite attention",
    "Signe a signaler au medecin"
  ],
  "conseil_sofia": "Un conseil bienveillant et rassurant pour ${nom} en la vouvoyant"
}`;
    }

    // === MEDICAMENTS ===
    else if (theme === 'medicaments') {
      type = 'ecran';
      prompt = `Tu es Sofia, une assistante chaleureuse pour aines quebecois.
IMPORTANT: Vouvoie toujours la personne (vous, votre, vos). Ne la tutoie jamais.
Genere des conseils sur la gestion des medicaments pour les aines en JSON. Reponds UNIQUEMENT en JSON sans texte avant ou apres:
{
  "titre": "Gestion des medicaments",
  "intro": "Introduction sur l'importance de bien gerer ses medicaments en 2 phrases en vouvoyant",
  "conseils": [
    {"titre": "Horaires", "icone": "⏰", "conseil": "Conseil sur les horaires de prise en vouvoyant"},
    {"titre": "Stockage", "icone": "🏠", "conseil": "Conseil sur le stockage des medicaments en vouvoyant"},
    {"titre": "Interactions", "icone": "⚠️", "conseil": "Conseil sur les interactions medicamenteuses en vouvoyant"},
    {"titre": "Renouvellement", "icone": "📋", "conseil": "Conseil sur le renouvellement des ordonnances en vouvoyant"},
    {"titre": "Questions medecin", "icone": "👨‍⚕️", "conseil": "Questions importantes a poser au medecin"}
  ],
  "astuces_pratiques": [
    "Astuce pratique 1 pour ne pas oublier ses medicaments",
    "Astuce pratique 2",
    "Astuce pratique 3",
    "Astuce pratique 4"
  ],
  "rappels_importants": [
    "Rappel important 1",
    "Rappel important 2",
    "Rappel important 3"
  ],
  "conseil_sofia": "Un conseil bienveillant pour ${nom} sur la gestion de ses medicaments en la vouvoyant"
}`;
    }

    // === THEMES VOCAUX ===
    else if (theme === 'sommeil') {
      prompt = `Tu es Sofia, une assistante chaleureuse pour aines quebecois.
IMPORTANT: Vouvoie toujours la personne (vous, votre, vos). Ne la tutoie jamais.
Donne des conseils pratiques et bienveillants sur le sommeil pour les personnes agees.
Parle directement a ${nom} de facon chaleureuse en la vouvoyant.
Inclus: conseils pour mieux dormir, routine du soir, quand consulter un medecin.
Sois rassurante et pratique. Maximum 150 mots.`;
      type = 'vocal';
    }

    else if (theme === 'hydratation') {
      prompt = `Tu es Sofia, une assistante chaleureuse pour aines quebecois.
IMPORTANT: Vouvoie toujours la personne (vous, votre, vos). Ne la tutoie jamais.
Donne des conseils pratiques sur l'hydratation a ${nom} en la vouvoyant.
Inclus: quelle quantite boire, signes de deshydratation, astuces pour boire plus.
Sois chaleureuse et pratique. Maximum 150 mots.`;
      type = 'vocal';
    }

    else if (theme === 'tension') {
      prompt = `Tu es Sofia, une assistante chaleureuse pour aines quebecois.
IMPORTANT: Vouvoie toujours la personne (vous, votre, vos). Ne la tutoie jamais.
Explique simplement la tension arterielle a ${nom} en la vouvoyant.
Inclus: chiffres normaux, habitudes saines, aliments a eviter, quand consulter.
Sois rassurante et simple. Maximum 150 mots.`;
      type = 'vocal';
    }

    else if (theme === 'bien_etre') {
      prompt = `Tu es Sofia, une assistante chaleureuse pour aines quebecois.
IMPORTANT: Vouvoie toujours la personne (vous, votre, vos). Ne la tutoie jamais.
Donne des conseils de bien-etre mental et emotionnel a ${nom} en la vouvoyant.
Inclus: gestion du stress, activites relaxantes, importance du lien social, exercices de respiration simples.
Sois tres chaleureuse et bienveillante. Maximum 150 mots.`;
      type = 'vocal';
    }

    else if (theme === 'dentaire') {
      prompt = `Tu es Sofia, une assistante chaleureuse pour aines quebecois.
IMPORTANT: Vouvoie toujours la personne (vous, votre, vos). Ne la tutoie jamais.
Donne des conseils de sante bucco-dentaire adaptes aux personnes agees a ${nom} en la vouvoyant.
Inclus: hygiene quotidienne, protheses dentaires si applicable, signes a surveiller, frequence des visites.
Sois pratique et bienveillante. Maximum 150 mots.`;
      type = 'vocal';
    }

    else if (theme === 'maladies') {
      const maladie = question || 'maladies courantes chez les aines';
      prompt = `Tu es Sofia, une assistante chaleureuse pour aines quebecois.
IMPORTANT: Vouvoie toujours la personne (vous, votre, vos). Ne la tutoie jamais.
Donne des informations claires et rassurantes sur ${maladie} a ${nom} en la vouvoyant.
Inclus: signes a surveiller, habitudes preventives, quand consulter un medecin.
IMPORTANT: Rappelle toujours de consulter un medecin pour tout diagnostic.
Sois rassurante et pratique. Maximum 200 mots.`;
      type = 'vocal';
    }

    else {
      prompt = `Tu es Sofia, une assistante chaleureuse pour aines quebecois.
IMPORTANT: Vouvoie toujours la personne (vous, votre, vos). Ne la tutoie jamais.
${nom} a une question de sante: "${question}".
Reponds de facon chaleureuse, simple et pratique en vouvoyant la personne.
IMPORTANT: Rappelle toujours de consulter un medecin pour tout diagnostic ou traitement.
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
