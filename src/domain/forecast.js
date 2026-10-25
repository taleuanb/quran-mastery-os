import { addDays } from './dates.js';
import { applyScore, learnThumun } from './scoring.js';
import { buildDailyPlan } from './plan.js';

/** @typedef {import('./plan.js').DailyPlan} DailyPlan */

/**
 * Simule la note 4 sur tout le plan d'un jour (sans modifier `state`), hors hizbs `skip`
 * (déjà relus, donc déjà notés dans `state`).
 * @param {import('./types.js').AppState} state
 * @param {DailyPlan} plan
 * @param {import('./types.js').Params} p
 * @param {number[]} [skip]
 */
function simulateDay(state, plan, p, skip = []) {
  const thumuns = { ...state.thumuns };
  // Comme REVIEW_HIZB : tous les thumuns acquis du hizb sont notés, quelle que soit leur piste.
  for (const { hizb } of plan.hizbs) {
    if (skip.includes(hizb)) continue;
    for (let n = 1; n <= 8; n++) {
      const id = `H${String(hizb).padStart(2, '0')}-T${n}`;
      const t = thumuns[id];
      if (t?.status === 'acquis') {
        thumuns[id] = applyScore(t, 4, plan.day, p);
      }
    }
  }
  const journal = [...state.journal];
  for (const id of plan.learn) {
    thumuns[id] = learnThumun(thumuns[id], 4, plan.day, p);
    journal.push({ id: `forecast-${plan.day}-${id}`, date: plan.day, thumunId: id, pilier: 'hifdh', score: 4, source: 'hifdh' });
  }
  return { ...state, thumuns, journal };
}

/**
 * Jour 0 lu dans l'enregistrement du jour (Ruling 24) : la liste `hizbs` telle quelle, avec la source
 * et le focus du plan frais quand il contient le hizb, sinon la source des révisions du jour (ou des pistes).
 * L'apprentissage proposé tient compte des thumuns déjà appris ce jour-là.
 */
function recordedPlan(state, refs, day, p, rec) {
  const fresh = buildDailyPlan(state, refs, day, p);
  const known = new Map(fresh.hizbs.map((h) => [h.hizb, h]));
  const sourceOf = (hizb) => {
    const prefix = `H${String(hizb).padStart(2, '0')}-`;
    const entries = state.journal.filter((e) => e.date === day && e.pilier === 'revision' && e.thumunId.startsWith(prefix));
    if (entries.length) return entries.some((e) => e.source === 'base') ? 'base' : 'cible';
    const tracks = Object.keys(state.thumuns).filter((id) => id.startsWith(prefix) && state.thumuns[id].status === 'acquis')
      .map((id) => state.thumuns[id].track);
    return tracks.includes('base') ? 'base' : 'cible';
  };
  const hizbs = rec.hizbs.map((hizb) => known.get(hizb) ?? { hizb, source: sourceOf(hizb), focus: [], urgent: false });
  const learnedToday = new Set(state.journal.filter((e) => e.date === day && e.pilier === 'hifdh').map((e) => e.thumunId)).size;
  return {
    ...fresh,
    learn: fresh.learn.slice(0, Math.max(0, p.dailyNewThumuns - learnedToday)),
    hizbs,
    baseCount: hizbs.filter((h) => h.source === 'base').length,
    cibleCount: hizbs.filter((h) => h.source === 'cible').length,
  };
}

/**
 * Prévision sur `days` jours : jour 0 = plan réel (l'enregistrement `dayLog[fromDay]` s'il existe,
 * ses hizbs non relus étant simulés relus au jour 0), puis chaque jour suppose la note 4 sur le plan de la veille.
 * @param {import('./types.js').AppState} state
 * @param {import('./types.js').Ref[]} refs
 * @param {string} fromDay
 * @param {number} days
 * @param {import('./types.js').Params} p
 * @returns {(DailyPlan & {predicted:boolean})[]}
 */
export function forecast(state, refs, fromDay, days, p) {
  const out = [];
  const rec = state.dayLog?.[fromDay];
  const recorded = Array.isArray(rec?.hizbs);
  let s = state;
  for (let i = 0; i < days; i++) {
    if (i > 0) s = simulateDay(s, out[i - 1], p, i === 1 && recorded ? (rec.reviewed ?? []) : []);
    const day = addDays(fromDay, i);
    const plan = i === 0 && recorded ? recordedPlan(s, refs, day, p, rec) : buildDailyPlan(s, refs, day, p);
    out.push({ ...plan, predicted: day > fromDay });
  }
  return out;
}
