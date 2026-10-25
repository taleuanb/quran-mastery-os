import { addDays } from './dates.js';

/** @typedef {import('./types.js').ThumunState} ThumunState */
/** @typedef {import('./types.js').Params} Params */

/**
 * Difficulté d'après les 5 dernières notes (seed comprises).
 * @param {{scores:{score:number}[]}} t
 * @returns {'difficile'|'moyen'|'facile'}
 */
export function difficulty(t) {
  const last = t.scores.slice(-5).map((s) => s.score);
  if (last.length === 0) return 'moyen';
  const avg = last.reduce((a, b) => a + b, 0) / last.length;
  if (avg < 3 || last.filter((s) => s <= 2).length >= 2) return 'difficile';
  if (last.length >= 3 && last.slice(-3).every((s) => s >= 4)) return 'facile';
  return 'moyen';
}

/**
 * Applique une note à un thumun (fonction pure).
 * @param {ThumunState} t
 * @param {number} score 1..5
 * @param {string} day
 * @param {Params} p
 * @returns {ThumunState}
 */
export function applyScore(t, score, day, p) {
  const next = {
    ...t,
    scores: [...t.scores, { date: day, score }],
    lastReviewed: day,
  };
  if (score >= 3) next.risk = false;

  if (t.track === 'base') {
    if (score >= 4) return next;
    next.track = 'cible';
    next.interval = p.initialInterval;
  }

  let interval;
  if (score <= 2) {
    interval = p.resetDays[score];
    if (score === 1) next.risk = true;
  } else {
    interval = Math.round(next.interval * p.multipliers[score]);
  }
  interval = Math.max(1, interval);
  interval = Math.min(interval, p.maxInterval);
  if (difficulty(next) === 'difficile') interval = Math.min(interval, p.hardMaxInterval);

  next.interval = interval;
  const last2 = next.scores.slice(-2);
  if (t.track === 'cible' && last2.length === 2 && last2.every((s) => s.score >= 4) && interval >= 7) {
    next.track = 'base';
    next.due = null;
  } else {
    next.due = addDays(day, interval);
  }
  return next;
}

/**
 * Premier apprentissage d'un thumun : acquis, flux ciblé, puis première note.
 * @param {ThumunState} t
 * @param {number} score
 * @param {string} day
 * @param {Params} p
 * @returns {ThumunState}
 */
export function learnThumun(t, score, day, p) {
  return applyScore({ ...t, status: 'acquis', track: 'cible', interval: p.initialInterval }, score, day, p);
}
