// Remplace l'approximation des thumuns par le fichier exact fourni par l'utilisateur.
// Usage : node scripts/import-thumuns.mjs <fichier.csv>
// Colonnes : id,hizb,thumun,sourate,verset (en-tête optionnel). Exige 480 lignes et tous les ids
// H01-T1 à H60-T8. En cas d'erreur : message sur stderr, code de sortie 1, aucun fichier écrit.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const outPath = resolve(dirname(fileURLToPath(import.meta.url)), '../src/data/thumuns.json');
const csvPath = process.argv[2];

function fail(message) {
  console.error(`Import annulé : ${message}`);
  process.exit(1);
}

if (!csvPath) fail('Usage : node scripts/import-thumuns.mjs <fichier.csv>');

let text;
try {
  text = readFileSync(csvPath, 'utf8');
} catch (e) {
  fail(`lecture impossible (${e.message})`);
}

const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim() !== '');
if (lines.length > 0 && lines[0].split(',')[0].trim().toLowerCase() === 'id') lines.shift();
if (lines.length !== 480) fail(`480 lignes attendues, ${lines.length} trouvées`);

const current = JSON.parse(readFileSync(outPath, 'utf8'));
const expected = new Map(current.map((r) => [r.id, r]));
const seen = new Set();
const rows = new Map();

lines.forEach((line, i) => {
  const [id, hizbStr, thumunStr, surah, ayahStr, ...extra] = line.split(',').map((c) => c.trim());
  const where = `ligne ${i + 1}`;
  if (extra.length > 0 || ayahStr === undefined) fail(`${where} : 5 colonnes attendues (id,hizb,thumun,sourate,verset)`);
  const ref = expected.get(id);
  if (!ref) fail(`${where} : id inattendu « ${id} »`);
  if (seen.has(id)) fail(`${where} : id en double « ${id} »`);
  seen.add(id);
  if (Number(hizbStr) !== ref.hizb || Number(thumunStr) !== ref.thumun) {
    fail(`${where} : hizb/thumun incohérents avec l'id ${id}`);
  }
  if (surah === '') fail(`${where} : sourate vide`);
  const ayah = Number(ayahStr);
  if (!Number.isInteger(ayah) || ayah < 1) fail(`${where} : verset invalide « ${ayahStr} »`);
  rows.set(id, { surah, ayah });
});

if (seen.size !== 480) fail('ids manquants');

const next = current.map((r) => ({ ...r, ...rows.get(r.id), approx: false }));
writeFileSync(outPath, JSON.stringify(next, null, 2) + '\n');
console.log(`${next.length} thumuns importés depuis ${csvPath}`);
