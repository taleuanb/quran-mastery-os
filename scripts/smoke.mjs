// Test de fumée de bout en bout (Playwright) : construit l'app, lance `vite preview`, parcourt les écrans
// en mode clair puis sombre (viewport 400×850) et échoue sur toute erreur console / de page.
// Usage : node scripts/smoke.mjs   (captures dans smoke-shots/, ignoré par git)
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

// Playwright est installé globalement (résolu via NODE_PATH, d'où require plutôt qu'import).
const { chromium } = createRequire(import.meta.url)('playwright');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const shots = resolve(root, 'smoke-shots');
mkdirSync(shots, { recursive: true });

function freePort() {
  return new Promise((res, rej) => {
    const srv = createServer();
    srv.once('error', rej);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => res(port));
    });
  });
}

async function waitFor(url, ms = 20000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try { if ((await fetch(url)).ok) return; } catch { /* pas encore prêt */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Serveur de prévisualisation injoignable : ${url}`);
}

const build = spawnSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit' });
if (build.status !== 0) {
  console.error('Échec du build');
  process.exit(1);
}

const port = await freePort();
const preview = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
  cwd: root, stdio: 'ignore', detached: true,
});
const stopPreview = () => { try { process.kill(-preview.pid); } catch { /* déjà arrêté */ } };
process.on('exit', stopPreview);

const errors = [];
let browser;
try {
  const url = `http://127.0.0.1:${port}/`;
  await waitFor(url);
  browser = await chromium.launch();

  for (const scheme of ['light', 'dark']) {
    const context = await browser.newContext({ viewport: { width: 400, height: 850 }, colorScheme: scheme });
    const page = await context.newPage();
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${scheme}] console: ${m.text()}`); });
    page.on('pageerror', (e) => errors.push(`[${scheme}] pageerror: ${e.message}`));

    const shot = (name) => page.screenshot({ path: resolve(shots, `smoke-${scheme}-${name}.png`), fullPage: true });
    const tab = (label) => page.locator('nav button', { hasText: label }).click();

    await page.goto(url);
    await page.waitForSelector('nav button');
    await shot('0-today-empty');

    await tab('Acquis');
    await page.getByRole('button', { name: 'Hizbs 1 à 12' }).click();
    await shot('1-acquis');

    await tab("Aujourd'hui");
    const checks = page.locator('button.check:not([disabled])');
    await checks.first().waitFor({ timeout: 5000 });
    if ((await page.locator('.tile').count()) < 1) throw new Error('Aucune carte de hizb sur Aujourd’hui');
    await shot('2-today');
    await checks.first().click();
    await page.getByText('Annuler').first().waitFor({ timeout: 5000 });
    await shot('3-today-validated');

    await tab('Agenda');
    await page.locator('.screen').first().waitFor();
    await shot('4-agenda');
    await tab('Stats');
    await page.locator('.screen').first().waitFor();
    await shot('5-stats');
    await tab('Réglages');
    await page.locator('.screen').first().waitFor();
    await shot('6-settings');

    const screens = await page.locator('.screen').count();
    if (screens !== 1) throw new Error(`[${scheme}] ${screens} écrans montés au lieu de 1`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    if (overflow) errors.push(`[${scheme}] défilement horizontal sur la page`);
    await context.close();
  }
} catch (e) {
  errors.push(`échec : ${e.message}`);
} finally {
  if (browser) await browser.close();
  stopPreview();
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('OK');
