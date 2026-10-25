# Moteur de révision et nouvelle interface : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer la maquette React actuelle (données fictives, Notion simulé) par une app locale qui suit 480 thumuns, calcule chaque jour la révision de base et ciblée, et propose 5 écrans mobiles.

**Architecture:** Un domaine pur en JavaScript (`src/domain/`) : dates, notation, plan du jour, prévision, statistiques, sans React et testé avec Vitest. Un store (`src/store/`) : reducer pur, persistance `localStorage`, export/import. L'interface (`src/ui/`, `src/screens/`) ne fait que lire l'état et envoyer des actions.

**Tech Stack:** React 18, Vite 5, Vitest + jsdom + @testing-library/react, CSS natif à jetons (Tailwind retiré), Node pour le script de données.

**Spec:** `docs/superpowers/specs/2026-10-25-revision-engine-design.md`. Maquette de référence : `docs/design/maquette.html` (à porter, classes et jetons compris).

## Global Constraints

- JavaScript (pas de TypeScript). Types documentés en JSDoc dans `src/domain/types.js`.
- Aucun backend, aucun appel réseau à l'exécution. Stockage `localStorage` uniquement, clé `qmos.state`.
- Identifiants des thumuns : `H01-T1` à `H60-T8`. Jamais renommés.
- Jour = chaîne `YYYY-MM-DD` calculée avec un changement de jour à **04:00** heure locale.
- Valeurs par défaut des paramètres : exactement celles de la section 4 de la spec (voir `DEFAULT_PARAMS`, tâche 0).
- Interface en français, contenu coranique en arabe (police Amiri, `dir="rtl"` sur ces éléments seulement). Tous les libellés dans `src/ui/strings.fr.js`.
- Mobile d'abord : largeur max 440 px, cibles tactiles ≥ 44 px, contraste ≥ 4,5:1, mode clair/sombre via `prefers-color-scheme`, `prefers-reduced-motion` respecté.
- Les notes 1 à 5 affichent toujours leur chiffre, jamais la couleur seule.

## Review Focus

1. **Hizb partiellement acquis** : valider un hizb ne doit noter que ses thumuns acquis, jamais les non acquis (test en tâche 7).
2. **Révision après minuit** : une saisie à 01:30 compte pour la veille (test en tâche 0).
3. **Stockage corrompu ou mauvais fichier importé** : pas de plantage, message en français, état inchangé (test en tâche 3).
4. **Premier lancement sans acquis** : plan vide sans erreur, apprentissage proposé `H01-T1` (test en tâche 5).
5. **Un même hizb dans la base et dans le ciblé** : il n'apparaît qu'une fois et ne consomme qu'une place (test en tâche 5).

## Ordre d'exécution (parallélisable)

| Vague | Tâches (en parallèle) | Dépend de |
|---|---|---|
| 0 | T0 Socle | — |
| 1 | T1 Référentiel · T2 Notation · T3 Persistance · T4 Coquille UI | T0 |
| 2 | T5 Plan + prévision · T6 Statistiques · T7 Actions + store | T2 (T7 : T2, T3) |
| 3 | T8 Aujourd'hui · T9 Agenda · T10 Acquis · T11 Stats + Réglages | T4, T5, T6, T7 |
| 4 | T12 Intégration et nettoyage | tout |

Chaque tâche ne touche que ses propres fichiers. Les seuls fichiers partagés (`src/App.jsx`, `package.json`) sont modifiés en T0, T4 et T12 uniquement.

---

### Task 0: Socle (outillage, types, dates, paramètres, fixtures)

**Files:**
- Modify: `package.json` (devDeps `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom` ; script `"test": "vitest run"`)
- Modify: `vite.config.js` (bloc `test: { environment: 'jsdom', setupFiles: ['src/test/setup.js'] }`)
- Create: `src/test/setup.js`, `src/test/fixtures.js`
- Create: `src/domain/types.js`, `src/domain/params.js`, `src/domain/dates.js`
- Test: `src/domain/dates.test.js`

**Interfaces (produites, utilisées partout) :**

```js
// types.js (JSDoc uniquement)
/** @typedef {{id:string,hizb:number,thumun:number,juz:number,hizbName:string,surah:string,ayah:number,approx:boolean}} Ref */
/** @typedef {{date:string,score:number,seed?:boolean}} ScoreEntry */
/** @typedef {{status:'non_acquis'|'acquis',track:'base'|'cible'|null,scores:ScoreEntry[],lastReviewed:string|null,interval:number,due:string|null,risk:boolean,fragileInitial:boolean}} ThumunState */
/** @typedef {{id:string,date:string,thumunId:string,pilier:'hifdh'|'revision',score:number,source:'base'|'cible'|'hifdh'}} Entry */
/** @typedef {{schemaVersion:1,params:Params,thumuns:Object<string,ThumunState>,journal:Entry[],learnQueue:string[],dayLog:Object<string,{planned:number,done:number}>,lastBackup:string|null,khatma:number}} AppState */
```

```js
// params.js
export const DEFAULT_PARAMS = {
  dailyReviewHizbs: 5, dailyNewThumuns: 1, restDays: [4, 6], baseRotationPerMonth: 2,
  multipliers: { 5: 2.5, 4: 2, 3: 1.3 }, resetDays: { 2: 2, 1: 1 },
  initialInterval: 3, maxInterval: 30, hardMaxInterval: 7, urgencyDays: 3,
  rolloverHour: 4, graceDaysPerWeek: 1, backupReminderDays: 7,
};
export const cycleDays = (p) => 30 / p.baseRotationPerMonth;
```

```js
// dates.js
export function dayKey(now: Date, rolloverHour: number): string
export function addDays(day: string, n: number): string
export function diffDays(a: string, b: string): number   // a - b en jours
export function weekday(day: string): number             // 0 = dimanche
```

```js
// fixtures.js
export function makeRefs(): Ref[]   // 480 refs synthétiques ordonnées, surah 'S'+hizb, hizbName 'H'+hizb, approx false
export function makeState({ acquis = [], cible = {}, params = {} , day = '2026-10-25'}): AppState
// acquis : numéros de hizbs entièrement acquis en base, seed 3, lastReviewed étalé (hizb le plus petit = le plus ancien)
// cible : { 'H14-T2': { scores:[1], interval:2, due:'2026-10-20' } } fusionné dans le thumun
```

- [ ] **Step 1 : tests de dates** dans `src/domain/dates.test.js` :
  - `dayKey(new Date(2026,9,26,1,30), 4) === '2026-10-25'`, `dayKey(new Date(2026,9,26,4,0), 4) === '2026-10-26'`
  - `addDays('2026-10-30', 3) === '2026-11-02'`, `diffDays('2026-11-02','2026-10-30') === 3`
  - `weekday('2026-10-29') === 4`
- [ ] **Step 2 :** `npm i -D vitest jsdom @testing-library/react @testing-library/jest-dom && npx vitest run src/domain/dates.test.js` → FAIL (module absent)
- [ ] **Step 3 :** implémenter `params.js`, `dates.js` (calcul en UTC sur la chaîne de jour pour éviter les décalages d'heure d'été), `types.js`, `fixtures.js`, `setup.js` (import `@testing-library/jest-dom/vitest`)
- [ ] **Step 4 :** `npx vitest run` → PASS
- [ ] **Step 5 :** commit `chore: socle tests, types, dates, paramètres`

---

### Task 1: Référentiel des 480 thumuns

**Files:**
- Create: `scripts/build-thumuns.mjs`, `scripts/import-thumuns.mjs`, `src/data/thumuns.json` (généré, commité), `src/domain/referential.js`
- Test: `src/domain/referential.test.js`

**Interfaces :**
- Produces : `loadRefs(): Ref[]` (480, ordre du Coran) ; `refById(id: string): Ref` ; `refsOfHizb(hizb: number): Ref[]` (8) ; `hizbInfo(hizb): {hizb, juz, hizbName, surah}`

Règles (spec section 18) :
- Débuts des 240 quarts de hizb : Tanzil `quran-data.js` (`HizbQaurters`), repli `malekverse/quran-dataset` (champ `hizb_quarter`). Noms arabes des sourates : métadonnées Tanzil.
- Thumuns impairs (`T1,T3,T5,T7`) = début du quart, `approx:false`. Thumuns pairs = verset du quart dont le cumul de lettres dépasse la moitié des lettres du quart, `approx:true` (texte Tanzil `quran-simple-clean` ; si le texte est inaccessible, milieu en nombre de versets).
- `hizbName` : colonne `Hizb_Name` de `classfication coran.csv`.
- `import-thumuns.mjs <fichier.csv>` : colonnes `id,hizb,thumun,sourate,verset`, exige 480 lignes et les ids attendus, réécrit `thumuns.json` avec `approx:false`, sinon sort en erreur sans écrire.

- [ ] **Step 1 : tests** :
  - `loadRefs().length === 480`, ids uniques, `refsOfHizb(26).length === 8`
  - `refById('H01-T1')` → `{surah:'الفاتحة', ayah:1, approx:false}` ; `H01-T3` → sourate 2 verset 26 ; `H01-T7` → 2:60 ; `H02-T1` → 2:75
  - `refById('H25-T1')` → `يوسف` 53, `hizbName:'وما أبرئ'` ; `H26-T1` → `الرعد` 19 ; `H60-T1` → `الأعلى` 1
  - tous les `T2,T4,T6,T8` ont `approx:true` ; chaque verset pair est strictement entre les deux débuts de quart voisins
- [ ] **Step 2 :** `npx vitest run src/domain/referential.test.js` → FAIL
- [ ] **Step 3 :** écrire `build-thumuns.mjs`, l'exécuter (`node scripts/build-thumuns.mjs`), commiter le JSON ; écrire `referential.js` (import JSON statique) et `import-thumuns.mjs`
- [ ] **Step 4 :** tests → PASS ; `node scripts/import-thumuns.mjs /dev/null` → code de sortie ≠ 0 et `thumuns.json` inchangé (`git diff --quiet src/data`)
- [ ] **Step 5 :** commit `feat: référentiel 480 thumuns (quarts fiables, huitièmes approximatifs)`

---

### Task 2: Notation et difficulté (flux ciblé)

**Files:**
- Create: `src/domain/scoring.js`
- Test: `src/domain/scoring.test.js`

**Interfaces :**
- Produces :
  - `applyScore(t: ThumunState, score: 1..5, day: string, p: Params): ThumunState` (pur)
  - `learnThumun(t, score, day, p): ThumunState` → `status:'acquis'`, `track:'cible'`, `interval = p.initialInterval` puis `applyScore`
  - `difficulty(t): 'difficile'|'moyen'|'facile'`

Règles :
- Toujours : ajouter `{date:day, score}` aux `scores`, `lastReviewed = day`.
- Thumun `base` : note ≥ 4 → reste base. Note ≤ 3 → passe `cible` avec `interval = p.initialInterval` puis règle ci-dessous.
- Thumun `cible` : 5/4/3 → `interval × multiplier` ; 2 → 2 j ; 1 → 1 j et `risk = true` (note ≥ 3 remet `risk = false`). Arrondi `Math.round`, minimum 1. Plafond `maxInterval`, et `hardMaxInterval` si `difficulty` (après ajout de la note) vaut `difficile`. `due = addDays(day, interval)`.
- Sortie vers la base : deux dernières notes ≥ 4 et nouvel intervalle ≥ 7 → `track:'base'`, `due:null`.
- `difficulty` sur les 5 dernières notes : `difficile` si moyenne < 3 ou au moins deux notes ≤ 2 ; `facile` si les 3 dernières sont ≥ 4 ; sinon `moyen`.

- [ ] **Step 1 : tests** (thumun ciblé avec `interval:10`, historique neutre `[3,4]`) :
  - note 5 → 25 ; 4 → 20 ; 3 → 13 ; 2 → 2 ; 1 → 1 et `risk:true` ; `due` = jour + intervalle
  - `interval:20`, note 5 → 30 (plafond)
  - historique `[2,2]`, `interval:10`, note 5 → 7 (plafond difficile)
  - base, note 4 → `track:'base'`, `lastReviewed` mis à jour, `due:null`
  - base, note 3 → `track:'cible'`, `interval:4`, `due: addDays(day,4)`
  - ciblé `interval:4`, scores `[...,4]`, note 4 → intervalle 8 → `track:'base'`
  - `difficulty` : `[1,2,4,4,4]` → difficile ; `[3,4,5,4]` → facile ; `[3,3,4]` → moyen
  - `learnThumun(nonAcquis, 4, day)` → acquis, ciblé, intervalle 6
- [ ] **Step 2 :** `npx vitest run src/domain/scoring.test.js` → FAIL
- [ ] **Step 3 :** implémenter `scoring.js`
- [ ] **Step 4 :** tests → PASS
- [ ] **Step 5 :** commit `feat: notation et difficulté du flux ciblé`

---

### Task 3: Persistance, export et import

**Files:**
- Create: `src/store/storage.js`
- Test: `src/store/storage.test.js`

**Interfaces :**
- Produces :
  - `createInitialState(refs: Ref[], params = DEFAULT_PARAMS): AppState` (tous `non_acquis`, `track:null`, `schemaVersion:1`)
  - `loadState(refs): AppState` (clé `qmos.state` ; absente ou illisible → `createInitialState`, sans exception)
  - `saveState(state): void` (try/catch, ne lève jamais)
  - `migrate(raw: object): AppState` (v1 = identité ; version inconnue → `Error('Version de sauvegarde non reconnue')`)
  - `exportState(state): string` (JSON indenté)
  - `importState(text: string): AppState` (JSON invalide → `Error('Fichier illisible : ce n'est pas une sauvegarde Quran Mastery OS')` ; ids inconnus → même message)
  - `backupDue(state, today): boolean` (`lastBackup` null ou plus vieux que `backupReminderDays`)

- [ ] **Step 1 : tests** : aller-retour `importState(exportState(s))` égal à `s` ; `localStorage` contenant `"{oops"` → `loadState` renvoie un état initial de 480 thumuns ; `importState('[]')` lève le message exact ; `migrate({schemaVersion:9})` lève ; `backupDue` vrai à 8 jours, faux à 3
- [ ] **Step 2 :** `npx vitest run src/store/storage.test.js` → FAIL
- [ ] **Step 3 :** implémenter `storage.js`
- [ ] **Step 4 :** tests → PASS
- [ ] **Step 5 :** commit `feat: persistance locale, export et import`

---

### Task 4: Coquille UI et système visuel

**Files:**
- Create: `src/ui/theme.css` (jetons spec 17.2, clair + sombre, classes portées de `docs/design/maquette.html`), `src/ui/strings.fr.js`
- Create: `src/ui/components/TabBar.jsx`, `BottomSheet.jsx`, `Toast.jsx`, `ScorePills.jsx`, `HizbLabel.jsx`
- Modify: `src/App.jsx` (5 onglets, écrans factices `<section>` titrés), `src/main.jsx` (import `theme.css`), `index.html` (`lang="fr"`, polices Google : Amiri, Bricolage Grotesque, Figtree, viewport sans `user-scalable=no`)
- Delete: `src/index.css`, `tailwind.config.js`, `postcss.config.js` ; retirer `tailwindcss`, `postcss`, `autoprefixer` de `package.json`
- Test: `src/ui/components/components.test.jsx`

**Interfaces :**
- Produces :
  - `t(key: string, vars?: object): string`
  - `<TabBar active onChange badge />` onglets `today|agenda|acquis|stats|settings`
  - `<BottomSheet open title subtitle onClose actions>{children}</BottomSheet>` (scrim cliquable, `role="dialog"`)
  - `<Toast message actionLabel onAction duration=5000 />`
  - `<ScorePills value onChange size="md|sm" />` (5 boutons, chiffre visible, `aria-pressed`)
  - `<HizbLabel hizb thumun? showName showSurah />` (numéro + `hizbName` + `سورة …` + `الثمن n/8`)

- [ ] **Step 1 : tests** : TabBar affiche 5 libellés et appelle `onChange('agenda')` ; ScorePills : clic sur « 2 » → `onChange(2)`, bouton 2 `aria-pressed=true` ; BottomSheet fermé non rendu, scrim → `onClose` ; HizbLabel `hizb=25 thumun=6` affiche `وما أبرئ`, `سورة يوسف`, `الثمن 6/8` (utilise `refsOfHizb` mocké par `vi.mock` si T1 n'est pas encore fusionnée)
- [ ] **Step 2 :** `npx vitest run src/ui` → FAIL
- [ ] **Step 3 :** implémenter (porter le CSS de la maquette ; cibles ≥ 44 px ; `env(safe-area-inset-bottom)` sur la barre)
- [ ] **Step 4 :** tests → PASS ; `npm run build` → OK
- [ ] **Step 5 :** commit `feat: coquille UI, jetons et composants de base`

---

### Task 5: Plan du jour et prévision

**Files:**
- Create: `src/domain/plan.js`, `src/domain/forecast.js`
- Test: `src/domain/plan.test.js`, `src/domain/forecast.test.js`

**Interfaces :**
- Consumes : `applyScore`, `difficulty` (T2) ; `cycleDays`, dates (T0)
- Produces :
  - `buildDailyPlan(state, refs, day, p): DailyPlan` avec `DailyPlan = { day, learn: string[], hizbs: {hizb:number, source:'base'|'cible', focus:string[], urgent:boolean}[], baseCount, cibleCount, overflowCible:number }`
  - `nextLearnThumuns(state, refs, day, p): string[]`
  - `forecast(state, refs, fromDay, days, p): (DailyPlan & {predicted:boolean})[]`

Algorithme `buildDailyPlan` (spec section 8) :
1. `A` = thumuns acquis ; `baseShare = min(quota, ceil(A/8 / cycleDays(p)))`.
2. Ciblés échus (`due <= day`). Urgents = dernière note ≤ 2 et retard > `urgencyDays` : leurs hizbs passent en premier (`urgent:true`).
3. Base : hizbs ayant au moins un thumun acquis en base, triés par le plus ancien `lastReviewed` de leurs thumuns base (null = plus ancien), puis numéro. On prend `baseShare` hizbs.
4. Ciblés restants triés par `retard × poids` (difficile 3, moyen 2, facile 1), puis numéro de hizb. Un thumun dont le hizb est déjà dans la liste s'ajoute à `focus` sans consommer de place.
5. S'il reste des places et plus de ciblés, la base complète jusqu'au quota. `overflowCible` = thumuns ciblés échus non placés.
6. `learn` : vide si `weekday(day)` ∈ `restDays` ; sinon `dailyNewThumuns` ids pris dans `learnQueue` (non acquis), puis le non acquis qui suit le dernier thumun appris (journal `hifdh`), puis le premier non acquis.

`forecast` : jour 0 = plan réel ; pour chaque jour suivant, simuler la note 4 sur tout le plan de la veille (via `applyScore`) puis recalculer ; `predicted = day > fromDay`.

- [ ] **Step 1 : tests plan** (`makeState`) :
  - 25 hizbs acquis, aucun ciblé, quota 5 → 5 hizbs base, ce sont les 5 plus anciens (1 à 5)
  - même état + ciblés échus dans les hizbs 2 et 30 → `baseShare` 2 (hizbs 1, 2), hizb 2 reçoit le `focus` ciblé sans nouvelle place, hizb 30 ajouté en ciblé
  - ciblé note `[1]` en retard de 5 jours (hizb 40) → premier élément, `urgent:true`
  - 12 hizbs ciblés échus, quota 5 → `overflowCible` > 0 et `hizbs.length === 5`
  - acquis vide → `hizbs: []`, `learn: ['H01-T1']` (Review Focus 4)
  - hizb présent en base et en ciblé → une seule entrée (Review Focus 5)
  - `'2026-10-29'` (jeudi) → `learn: []` ; `learnQueue:['H30-T1']` → `learn: ['H30-T1']`
  - absence de 30 jours (tous `lastReviewed` anciens) → toujours 5 hizbs, urgents en tête
- [ ] **Step 2 : tests prévision** : 7 entrées ; base du jour 1 ≠ base du jour 0 ; jour 0 `predicted:false`, jours suivants `true`
- [ ] **Step 3 :** `npx vitest run src/domain/plan.test.js src/domain/forecast.test.js` → FAIL
- [ ] **Step 4 :** implémenter `plan.js`, `forecast.js`
- [ ] **Step 5 :** tests → PASS ; commit `feat: plan du jour et prévision`

---

### Task 6: Statistiques

**Files:**
- Create: `src/domain/stats.js`
- Test: `src/domain/stats.test.js`

**Interfaces :**
- Consumes : `difficulty` (T2)
- Produces :
  - `streak(dayLog, today, p): number` (jour validé = `done >= planned` et `planned > 0` ; aujourd'hui compte seulement s'il est validé ; un jour manqué est pardonné s'il n'y a pas d'autre jour pardonné dans les 7 jours précédents ; un jour pardonné ne compte pas)
  - `regularity(dayLog, today, n = 30): number` (0..1)
  - `distribution(state): {difficile, moyen, facile}` (thumuns acquis)
  - `topFragile(state, n = 10): {id, last:number, trend:'up'|'down'|'flat'}[]` (tri par moyenne des 5 dernières notes croissante)
  - `actualCycleDays(state, today): number` (hizbs acquis ÷ hizbs de base révisés par jour en moyenne sur 14 jours, arrondi)
  - `hizbHeat(state, today): {hizb, solidity:number|null, ageDays:number|null}[]` (60)

- [ ] **Step 1 : tests** : 5 jours validés, 1 manqué, 3 validés → `streak === 8` ; deux manqués à 3 jours d'écart → la série s'arrête au second ; `regularity` 27/30 → 0.9 ; `distribution` et `topFragile` sur un état à 3 thumuns aux historiques `[1,2]`, `[3,3]`, `[5,5,5]` ; `hizbHeat` renvoie 60 lignes, `null` pour un hizb non acquis
- [ ] **Step 2 :** `npx vitest run src/domain/stats.test.js` → FAIL
- [ ] **Step 3 :** implémenter
- [ ] **Step 4 :** tests → PASS ; commit `feat: statistiques (série, régularité, fragiles, carte)`

---

### Task 7: Actions et store React

**Files:**
- Create: `src/store/reducer.js`, `src/store/useAppStore.js`
- Test: `src/store/reducer.test.js`

**Interfaces :**
- Consumes : `applyScore`, `learnThumun` (T2) ; `loadState`, `saveState` (T3) ; `refsOfHizb` (T1, mocké en test si absent)
- Produces :
  - `reducer(state, action): AppState`, actions :
    - `SET_ACQUIS {changes: {[id]: 0|1|2}, day}` : 0 = non acquis ; 1 = acquis base, seed 3 ; 2 = fragile, seed 2, `track:'cible'`, `interval:2`, `due:day`. Les hizbs nouvellement acquis en base reçoivent un `lastReviewed` étalé sur `cycleDays` (le plus petit numéro = le plus ancien).
    - `REVIEW_HIZB {hizb, day, overrides: {[id]: score}}` : note 4 (ou l'override) pour chaque thumun **acquis** du hizb ; journal `revision`, `source` = piste du thumun ; `dayLog[day].done += 1`
    - `SCORE_THUMUN {id, score, day}` · `LEARN {id, score, day}` (journal `hifdh`)
    - `MARK_FORGOTTEN {id, day}` (note 1, piste ciblée) · `UNDO` (rétablit l'état précédent la dernière action notée, une seule profondeur)
    - `EDIT_ENTRY {entryId, score}` : réécrit l'entrée puis rejoue le thumun depuis son seed
    - `SET_PARAMS {patch}` · `SET_LEARN_QUEUE {ids}` · `SET_PLANNED {day, planned}` · `MARK_BACKUP {day}` · `KHATMA_INC` · `IMPORT {state}`
  - `useAppStore(): {state, dispatch, refs, today}` (useReducer, `saveState` à chaque changement, `today = dayKey(new Date(), params.rolloverHour)`)

- [ ] **Step 1 : tests** :
  - `SET_ACQUIS` sur les 8 thumuns du hizb 3 → 8 acquis base ; un thumun à 2 → ciblé, `due` = jour
  - `REVIEW_HIZB` sur un hizb dont 5 thumuns sont acquis → exactement 5 entrées de journal (Review Focus 1)
  - override `{ 'H03-T6': 2 }` → ce thumun passe ciblé, les 7 autres restent base
  - `UNDO` après `REVIEW_HIZB` → état identique à l'avant
  - `EDIT_ENTRY` de 4 à 1 → le thumun est ciblé avec `risk:true`
- [ ] **Step 2 :** `npx vitest run src/store/reducer.test.js` → FAIL
- [ ] **Step 3 :** implémenter
- [ ] **Step 4 :** tests → PASS ; commit `feat: actions, annulation et store`

---

### Task 8: Écran Aujourd'hui

**Files:**
- Create: `src/screens/Today.jsx`
- Test: `src/screens/Today.test.jsx`

**Interfaces :** Consumes `useAppStore` (T7), `buildDailyPlan` (T5), `streak` (T6), `backupDue` (T3), composants T4.

Contenu (spec 17.4) : en-tête date + série ; anneau `faits/prévus` ; carte Apprentissage (`HizbLabel` + début de verset, bouton « J'ai appris ce thumun » puis `ScorePills` → `LEARN`) ; cartes de hizb (badge base/ciblé, `focus` affiché « Surtout : الثمن n/8 ») ; bouton ✓ → `REVIEW_HIZB` sans override + toast « Annuler » → `UNDO` ; toucher la carte → `BottomSheet` 8 lignes `ScorePills` (thumuns non acquis désactivés) → `REVIEW_HIZB` avec overrides ; bandeau si `overflowCible > 0` (« N thumuns faibles en attente ») ; bandeau sauvegarde si `backupDue`. Dispatch `SET_PLANNED` au montage.

- [ ] **Step 1 : tests** (store injecté via un état fixture) : 5 cartes affichées ; clic ✓ sur la première → 1 action `REVIEW_HIZB` et toast visible ; clic « Annuler » → `UNDO` ; état sans acquis → texte « Commencez par indiquer vos acquis » et lien vers l'onglet Acquis
- [ ] **Step 2 :** FAIL → **Step 3 :** implémenter → **Step 4 :** PASS
- [ ] **Step 5 :** commit `feat: écran Aujourd'hui`

---

### Task 9: Écran Agenda

**Files:**
- Create: `src/screens/Agenda.jsx`
- Test: `src/screens/Agenda.test.jsx`

**Interfaces :** Consumes `forecast` (T5), `streak`, `regularity`, `actualCycleDays` (T6), `dayLog`, composants T4.

Contenu (spec 17.5, maquette onglet Agenda) : bascule Semaine/Mois. Semaine = 7 jours à partir d'aujourd'hui (flèches ± 7 j), bande d'états, totaux, légende, une ligne par jour avec puces numéros seulement (`c b` base, `c g` ciblé en pointillé, `c l` apprentissage `26·2/8`, « repos apprentissage »), statut à droite, mention « Le ciblé dépend de vos notes ». Jours passés lus dans `dayLog` et le journal, pas dans la prévision. Mois = grille lundi en premier, couleurs complet/partiel/manqué, barre de charge sur les jours futurs. Toucher un jour → `BottomSheet` avec `HizbLabel` par hizb.

- [ ] **Step 1 : tests** : vue semaine → 7 lignes ; les puces ciblées des jours futurs ont la classe `g` ; bascule Mois → 31 cellules pour octobre 2026 dont la 1re dans la colonne jeudi
- [ ] **Step 2 :** FAIL → **Step 3 :** implémenter → **Step 4 :** PASS
- [ ] **Step 5 :** commit `feat: écran Agenda (semaine, mois)`

---

### Task 10: Écran Acquis

**Files:**
- Create: `src/screens/Acquis.jsx`
- Test: `src/screens/Acquis.test.jsx`

**Interfaces :** Consumes `SET_ACQUIS` (T7), `hizbInfo`, `refsOfHizb` (T1), composants T4.

Contenu (spec 17.6) : anneau sur 480 ; recherche (numéro, nom, sourate, début de verset) ; filtres Tous/Acquis/Partiels/Fragiles/Non acquis ; grille par juz avec barre par juz ; tap → bascule hizb entier ; appui long 450 ms → feuille 8 thumuns à 3 états (Non/Acquis/Fragile ; « Fragile » sur un thumun déjà acquis envoie `MARK_FORGOTTEN`) ; bouton Mode sélection (glissement, barre d'actions Acquis/Retirer) ; hors mode, défilement libre (`touch-action` normal) ; raccourci « Hizbs 1 à 12 ».

- [ ] **Step 1 : tests** : tap sur le hizb 3 → `SET_ACQUIS` avec 8 changements à 1 ; recherche « يوسف » ne laisse que les hizbs dont la sourate correspond ; filtre « Fragiles » sur un état avec un thumun fragile → 1 carte
- [ ] **Step 2 :** FAIL → **Step 3 :** implémenter → **Step 4 :** PASS
- [ ] **Step 5 :** commit `feat: écran Acquis`

---

### Task 11: Écrans Statistiques et Réglages

**Files:**
- Create: `src/screens/Stats.jsx`, `src/screens/Settings.jsx`
- Test: `src/screens/Stats.test.jsx`, `src/screens/Settings.test.jsx`

**Interfaces :** Consumes T6 (stats), T3 (`exportState`, `importState`), T7 (`SET_PARAMS`, `MARK_BACKUP`, `IMPORT`, `KHATMA_INC`).

Stats (spec 17.7) : 3 chiffres clés, barre de répartition, carte 60 hizbs (bascule solidité/ancienneté), 10 fragiles avec `HizbLabel`. Réglages (spec 17.8) : pas à pas pour quotas, fréquence 1×/2× par mois, plafond, jours de repos (7 bascules), paramètres avancés repliés (multiplicateurs, seuils), compteur khatma, Exporter (téléchargement d'un fichier `qmos-AAAA-MM-JJ.json` via `Blob`) puis `MARK_BACKUP`, Importer (`<input type=file>`, erreur affichée en français, état inchangé si erreur). Liste d'apprentissage : ajouter un thumun (sélecteur hizb puis thumun), monter/descendre, retirer → `SET_LEARN_QUEUE`. Historique : 20 dernières saisies, toucher une entrée → `ScorePills` → `EDIT_ENTRY`.

- [ ] **Step 1 : tests** : Stats affiche 60 cases de carte ; Réglages « + » sur le quota → `SET_PARAMS {dailyReviewHizbs: 6}` ; import d'un fichier invalide → message « Fichier illisible » et aucun `IMPORT` ; modifier une entrée de l'historique → `EDIT_ENTRY` avec la nouvelle note
- [ ] **Step 2 :** FAIL → **Step 3 :** implémenter → **Step 4 :** PASS
- [ ] **Step 5 :** commit `feat: écrans Statistiques et Réglages`

---

### Task 12: Intégration et nettoyage

**Files:**
- Modify: `src/App.jsx` (brancher les 5 écrans et `useAppStore`, badge sur Aujourd'hui si hizbs restants)
- Delete: `src/components/`, `src/hooks/`, `src/constants/`, `src/services/`, `src/context/`, `atman_referentiel.json`
- Modify: `README.md` (démarrage, tests, import du fichier exact des thumuns, aucune donnée hors du téléphone)
- Create: `scripts/smoke.mjs` (Playwright, viewport 400×850)

- [ ] **Step 1 :** `scripts/smoke.mjs` : lance `vite preview`, ouvre l'app, marque les hizbs 1 à 12 dans Acquis, revient sur Aujourd'hui, valide un hizb, ouvre l'Agenda, vérifie l'absence d'erreur console et enregistre `smoke-*.png`
- [ ] **Step 2 :** `npm test` → tout PASS ; `npm run build` → OK ; `node scripts/smoke.mjs` → « OK » et 0 erreur console
- [ ] **Step 3 :** vérifier les captures (clair et sombre) contre `docs/design/maquette.html`
- [ ] **Step 4 :** commit `feat: intégration des 5 écrans, suppression de l'ancien code`
