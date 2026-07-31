// Manchettes du jour, lues directement dans les fils RSS.
//
// Trois choses comptent ici, et l'ancienne version n'en faisait aucune :
//   1. On lit la DATE de chaque article et on rejette ce qui est vieux.
//      Sans ça, un fil qui traîne de vieux billets faisait passer Sofia
//      pour désuète.
//   2. On trie du plus récent au plus ancien.
//   3. On interroge tous les fils EN PARALLÈLE. En série, quinze fils à
//      5 secondes de délai d'attente pouvaient dépasser la limite de temps
//      de la fonction et ne rien retourner du tout.
//
// Les fils ci-dessous ont tous été vérifiés comme actifs et à jour.
// Les deux anciens fils culture de Radio-Canada (rss/6048 et rss/4172) ne
// répondent plus du tout : ils ont été remplacés par Le Devoir culture.

const SOURCES = [
  // --- Québec ---
  { url: 'https://ici.radio-canada.ca/rss/4159',                  nom: 'Radio-Canada',    categorie: 'quebec',  max: 6 },
  { url: 'https://www.ledevoir.com/rss/manchettes.xml',            nom: 'Le Devoir',       categorie: 'quebec',  max: 5 },
  { url: 'https://www.lapresse.ca/actualites/rss',                 nom: 'La Presse',       categorie: 'quebec',  max: 5 },
  { url: 'https://www.journaldemontreal.com/rss.xml',              nom: 'Journal de Montréal', categorie: 'quebec', max: 4 },

  // --- Canada ---
  { url: 'https://rss.cbc.ca/lineup/canada.xml',                   nom: 'CBC Canada',      categorie: 'canada',  max: 6, langue: 'en' },
  { url: 'https://rss.cbc.ca/lineup/politics.xml',                 nom: 'CBC Politique',   categorie: 'canada',  max: 4, langue: 'en' },

  // --- États-Unis ---
  // Le fil « Amériques » de RFI parle surtout d'Amérique latine : il est classé
  // dans « monde », pas ici. Ces trois-ci portent bien sur les États-Unis.
  { url: 'https://www.lapresse.ca/international/etats-unis/rss',    nom: 'La Presse É-U',   categorie: 'usa',     max: 6 },
  { url: 'https://www.ledevoir.com/rss/section/monde/etats-unis.xml', nom: 'Le Devoir É-U', categorie: 'usa',     max: 5 },
  { url: 'https://feeds.npr.org/1003/rss.xml',                      nom: 'NPR National',    categorie: 'usa',     max: 5, langue: 'en' },

  // --- Monde ---
  { url: 'https://www.france24.com/fr/rss',                        nom: 'France 24',       categorie: 'monde',   max: 5 },
  { url: 'https://rss.cbc.ca/lineup/world.xml',                    nom: 'CBC Monde',       categorie: 'monde',   max: 4, langue: 'en' },
  { url: 'https://www.lapresse.ca/international/rss',              nom: 'La Presse Intl',  categorie: 'monde',   max: 4 },
  { url: 'https://www.ledevoir.com/rss/section/monde.xml',         nom: 'Le Devoir Monde',  categorie: 'monde',   max: 4 },
  { url: 'https://www.rfi.fr/fr/am%C3%A9riques/rss',               nom: 'RFI Amériques',   categorie: 'monde',   max: 3 },

  // --- Culture ---
  { url: 'https://www.ledevoir.com/rss/section/culture.xml',       nom: 'Le Devoir Culture', categorie: 'culture', max: 4 }
];

const CATEGORIES = ['quebec', 'canada', 'usa', 'monde', 'culture'];

// Fenêtres de fraîcheur successives. On prend la première qui donne assez
// d'articles : un samedi matin tranquille, 24 h peut ne rien donner.
const FENETRES_HEURES = [24, 48, 96, 24 * 365 * 20];
const MINIMUM_SOUHAITE = 10;

/** Décode les entités XML/HTML que les fils RSS laissent dans les titres. */
function decoder(texte) {
  return String(texte == null ? '' : texte)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]*>/g, '')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/&laquo;/g, '«').replace(/&raquo;/g, '»')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')          // toujours en dernier
    .replace(/\s+/g, ' ')
    .trim();
}

function premierGroupe(regex, xml) {
  const m = regex.exec(xml);
  if (!m) return '';
  for (let i = 1; i < m.length; i++) if (m[i]) return m[i];
  return '';
}

/** Date de publication, quel que soit le dialecte du fil (RSS ou Atom). */
function lireDate(itemXml) {
  const brut = premierGroupe(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i, itemXml)
    || premierGroupe(/<dc:date[^>]*>([\s\S]*?)<\/dc:date>/i, itemXml)
    || premierGroupe(/<updated[^>]*>([\s\S]*?)<\/updated>/i, itemXml)
    || premierGroupe(/<published[^>]*>([\s\S]*?)<\/published>/i, itemXml);
  if (!brut) return null;
  const t = Date.parse(decoder(brut));
  return Number.isNaN(t) ? null : t;
}

/** Extrait les articles d'un fil, sans les filtrer : le tri vient après. */
function extraire(xml, source) {
  const articles = [];
  // <item> pour RSS, <entry> pour Atom.
  const blocRegex = /<(item|entry)[\s>][\s\S]*?<\/\1>/gi;
  let bloc;
  while ((bloc = blocRegex.exec(xml)) !== null && articles.length < source.max) {
    const itemXml = bloc[0];
    const titre = decoder(premierGroupe(/<title[^>]*>([\s\S]*?)<\/title>/i, itemXml));
    if (titre.length <= 5) continue;

    const description = decoder(
      premierGroupe(/<description[^>]*>([\s\S]*?)<\/description>/i, itemXml)
      || premierGroupe(/<summary[^>]*>([\s\S]*?)<\/summary>/i, itemXml)
    ).substring(0, 240);

    articles.push({
      titre,
      description,
      source: source.nom,
      categorie: source.categorie,
      langue: source.langue || 'fr',
      date: lireDate(itemXml)
    });
  }
  return articles;
}

async function lireSource(source) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    // Le paramètre anti-cache empêche un intermédiaire de resservir le fil d'hier.
    const separateur = source.url.indexOf('?') === -1 ? '?' : '&';
    const response = await fetch(source.url + separateur + 'sofia=' + Date.now(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Sofia/1.0)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      signal: controller.signal
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return extraire(await response.text(), source);
  } catch (e) {
    console.log('Source en échec:', source.nom, e.message);
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

function cleTitre(titre) {
  return titre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}

exports.handler = async function() {
  try {
    const maintenant = Date.now();

    // Tous les fils en parallèle : le plus lent fixe la durée totale, pas la somme.
    const parSource = await Promise.all(SOURCES.map(lireSource));
    let tous = [].concat.apply([], parSource);

    // Doublons : la même dépêche revient souvent chez deux quotidiens.
    const vus = new Set();
    tous = tous.filter(a => {
      const k = cleTitre(a.titre);
      if (!k || vus.has(k)) return false;
      vus.add(k);
      return true;
    });

    // On resserre autant que possible sur les articles récents.
    let retenus = [];
    let fenetreRetenue = FENETRES_HEURES[FENETRES_HEURES.length - 1];
    for (const heures of FENETRES_HEURES) {
      const limite = maintenant - heures * 3600 * 1000;
      // Un article sans date n'est gardé qu'en dernier recours.
      const candidats = tous.filter(a => a.date !== null && a.date >= limite && a.date <= maintenant + 3600 * 1000);
      if (candidats.length >= MINIMUM_SOUHAITE || heures === FENETRES_HEURES[FENETRES_HEURES.length - 1]) {
        retenus = candidats.length ? candidats : tous;
        fenetreRetenue = heures;
        break;
      }
    }

    // Du plus récent au plus ancien. Les sans-date passent à la fin.
    retenus.sort((a, b) => (b.date || 0) - (a.date || 0));

    const parCategorie = {};
    CATEGORIES.forEach(c => { parCategorie[c] = []; });
    retenus.forEach(a => {
      if (parCategorie[a.categorie]) parCategorie[a.categorie].push(a);
    });

    const enrichir = a => ({
      titre: a.titre,
      description: a.description,
      source: a.source,
      langue: a.langue,
      date: a.date ? new Date(a.date).toISOString() : null,
      ageHeures: a.date ? Math.round((maintenant - a.date) / 3600000) : null
    });

    const corps = {
      articles: retenus.map(enrichir),
      total: retenus.length,
      fenetreHeures: fenetreRetenue,
      genereA: new Date(maintenant).toISOString()
    };
    CATEGORIES.forEach(c => { corps[c] = parCategorie[c].map(enrichir); });

    if (retenus.length === 0) {
      corps.quebec = [{
        titre: 'Les nouvelles sont temporairement indisponibles',
        description: 'Veuillez réessayer dans quelques minutes.',
        source: 'Sofia', langue: 'fr', date: null, ageHeures: null
      }];
      corps.articles = corps.quebec;
      corps.total = 1;
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        // Sans ça, le CDN pouvait resservir les manchettes d'hier.
        'Cache-Control': 'no-store, max-age=0'
      },
      body: JSON.stringify(corps)
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify({ error: error.message })
    };
  }
};
