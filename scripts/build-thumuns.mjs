// Génère src/data/thumuns.json (480 thumuns) à partir de :
//  - un jeu de données de versets (JSON de malekverse/quran-dataset : un enregistrement par verset
//    avec surah_no, surah_name_ar, ayah_no_surah, ayah_ar, hizb_quarter) ;
//  - `classfication coran.csv` (colonne Hizb_Name, une valeur par hizb).
//
// Usage : node scripts/build-thumuns.mjs <quran_dataset.json> [<classfication coran.csv>] [<sortie.json>]
//
// Règles (spec section 18) :
//  - T1, T3, T5, T7 = début du quart de hizb (fiable, approx:false) ;
//  - T2, T4, T6, T8 = premier verset du quart dont le cumul de lettres dépasse la moitié des lettres
//    du quart (approx:true).
// Le fichier téléchargé est traité comme une donnée (JSON.parse uniquement, jamais exécuté).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [datasetPath, csvPath = resolve(root, 'classfication coran.csv'), outPath = resolve(root, 'src/data/thumuns.json')] =
  process.argv.slice(2);

if (!datasetPath) {
  console.error('Usage: node scripts/build-thumuns.mjs <quran_dataset.json> [<classfication coran.csv>] [<sortie.json>]');
  process.exit(1);
}

/**
 * Nombre de lettres d'un verset : lettres de base arabes (U+0621-U+064A, alif wasla U+0671) plus l'alif
 * suscrit U+0670 (qui remplace un alif écrit dans le texte "simple"). Harakat, shadda, signes de pause
 * et petites lettres sont ignorés, ce qui approche le décompte sur le texte Tanzil simple-clean.
 */
export function countLetters(text) {
  let n = 0;
  for (const ch of text) {
    const c = ch.codePointAt(0);
    if ((c >= 0x0621 && c <= 0x064a) || c === 0x0671 || c === 0x0670) n++;
  }
  return n;
}

/**
 * Coquilles connues du CSV (lettres latines mêlées à l'arabe) : « قال رجلan » (H12, 5 lignes sur 8, les 3
 * autres portent déjà « قال رجلان ») et « أولm يروا » (H30, 8 lignes) ; fautes d'orthographe de H28 (alif final
 * manquant), H38 (hamza sur waw) et H46 (dal au lieu de dhal). Corrigées ici plutôt que dans le CSV.
 */
const CSV_NAME_FIXES = {
  'قال رجلan': 'قال رجلان',
  'أولm يروا': 'أولم يروا',
  'وقال الله لا تتخذو': 'وقال الله لا تتخذوا',
  'قالوا أنومن': 'قالوا أنؤمن',
  'فنبدناه': 'فنبذناه',
};

/** Noms de hizb depuis le CSV : nom le plus fréquent par hizb, après correction des coquilles connues. */
export function hizbNamesFromCsv(csvText) {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim() !== '');
  const header = lines.shift().split(',');
  const iHizb = header.indexOf('Hizb_Number');
  const iName = header.indexOf('Hizb_Name');
  if (iHizb < 0 || iName < 0) throw new Error('Colonnes Hizb_Number / Hizb_Name introuvables');
  const counts = new Map();
  for (const line of lines) {
    const cols = line.split(',');
    const hizb = Number(cols[iHizb]);
    const raw = cols[iName].trim();
    const name = CSV_NAME_FIXES[raw] ?? raw;
    if (/[A-Za-z]/.test(name)) throw new Error(`Nom de hizb ${hizb} avec lettres latines : « ${raw} »`);
    if (!counts.has(hizb)) counts.set(hizb, new Map());
    const m = counts.get(hizb);
    m.set(name, (m.get(name) ?? 0) + 1);
  }
  const names = {};
  for (let h = 1; h <= 60; h++) {
    const m = counts.get(h);
    if (!m) throw new Error(`Hizb ${h} absent du CSV`);
    names[h] = [...m.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }
  return names;
}

export function buildThumuns(verses, hizbNames) {
  if (verses.length !== 6236) throw new Error(`6236 versets attendus, ${verses.length} trouvés`);
  const quarters = Array.from({ length: 241 }, () => []);
  for (const v of verses) quarters[v.hizb_quarter].push(v);
  for (let q = 1; q <= 240; q++) if (quarters[q].length === 0) throw new Error(`Quart ${q} vide`);

  const thumuns = [];
  for (let q = 1; q <= 240; q++) {
    const hizb = Math.ceil(q / 4);
    const k = (q - 1) % 4; // quart dans le hizb (0..3)
    const verses = quarters[q];
    const first = verses[0];
    const letters = verses.map((v) => countLetters(v.ayah_ar));
    const total = letters.reduce((a, b) => a + b, 0);
    let cum = 0;
    let mid = verses[verses.length - 1];
    for (let i = 0; i < verses.length; i++) {
      cum += letters[i];
      if (cum * 2 > total) {
        mid = verses[i];
        break;
      }
    }
    for (const [offset, v, approx] of [[1, first, false], [2, mid, true]]) {
      const thumun = 2 * k + offset;
      thumuns.push({
        id: `H${String(hizb).padStart(2, '0')}-T${thumun}`,
        hizb,
        thumun,
        juz: Math.ceil(hizb / 2),
        hizbName: hizbNames[hizb],
        surah: v.surah_name_ar,
        ayah: v.ayah_no_surah,
        approx,
      });
    }
  }
  return thumuns;
}

// Exécution en ligne de commande uniquement (le module reste importable sans effet de bord).
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const verses = JSON.parse(readFileSync(datasetPath, 'utf8'));
  const names = hizbNamesFromCsv(readFileSync(csvPath, 'utf8'));
  const thumuns = buildThumuns(verses, names);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(thumuns, null, 2) + '\n');
  console.log(`${thumuns.length} thumuns écrits dans ${outPath}`);
}
