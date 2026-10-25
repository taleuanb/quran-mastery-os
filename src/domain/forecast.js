import { addDays } from './dates.js';
import { applyScore, learnThumun } from './scoring.js';
import { buildDailyPlan } from './plan.js';

/** @typedef {import('./plan.js').DailyPlan} DailyPlan */

/**
 * Simule la note 4 sur tout le plan d'un jour (sans modifier `state`).
 * @param {import('./types.js').AppState} state
 * @param {DailyPlan} plan
 * @param {import('./types.js').Params} p
 */
function simulateDay(state, plan, p) {
  const thumuns = { ...state.thumuns };
  for (const { hizb, focus } of plan.hizbs) {
    for (let n = 1; n <= 8; n++) {
      const id = `H${String(hizb).padStart(2, '0')}-T${n}`;
      const t = thumuns[id];
      if (t?.status === 'acquis' && (t.track === 'base' || focus.includes(id))) {
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
 * Prévision sur `days` jours : jour 0 = plan réel, puis chaque jour suppose la note 4 sur le plan de la veille.
 * @param {import('./types.js').AppState} state
 * @param {import('./types.js').Ref[]} refs
 * @param {string} fromDay
 * @param {number} days
 * @param {import('./types.js').Params} p
 * @returns {(DailyPlan & {predicted:boolean})[]}
 */
export function forecast(state, refs, fromDay, days, p) {
  const out = [];
  let s = state;
  for (let i = 0; i < days; i++) {
    if (i > 0) s = simulateDay(s, out[i - 1], p);
    const day = addDays(fromDay, i);
    out.push({ ...buildDailyPlan(s, refs, day, p), predicted: day > fromDay });
  }
  return out;
}
