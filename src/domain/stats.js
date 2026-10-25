import { addDays, diffDays } from './dates.js';
import { difficulty } from './scoring.js';

/** @typedef {import('./types.js').AppState} AppState */
/** @typedef {import('./types.js').Params} Params */

const pad2 = (n) => String(n).padStart(2, '0');
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** Jour validé : journée prévue (planned > 0) et entièrement faite. */
function validated(entry) {
  return !!entry && entry.planned > 0 && entry.done >= entry.planned;
}

/**
 * Série de jours validés. Aujourd'hui compte seulement s'il est validé. Un jour manqué
 * est pardonné (et ne compte pas) s'il n'y a pas déjà `graceDaysPerWeek` jour(s) pardonné(s)
 * dans les 7 jours qui le suivent ; sinon la série s'arrête. Un jour antérieur à la
 * première entrée du journal termine la série.
 * @param {Object<string,import('./types.js').DayRecord>} dayLog
 * @param {string} today
 * @param {Params} p
 * @returns {number}
 */
export function streak(dayLog, today, p) {
  const days = Object.keys(dayLog);
  if (days.length === 0) return 0;
  const first = days.reduce((a, b) => (a < b ? a : b));
  let count = validated(dayLog[today]) ? 1 : 0;
  const forgiven = []; // décalages (en jours) des jours pardonnés, depuis aujourd'hui
  for (let i = 1; ; i++) {
    const day = addDays(today, -i);
    if (day < first) break;
    if (validated(dayLog[day])) {
      count++;
      continue;
    }
    const recent = forgiven.filter((j) => i - j <= 7).length;
    if (recent >= p.graceDaysPerWeek) break;
    forgiven.push(i);
  }
  return count;
}

/**
 * Part des jours validés parmi les `n` jours précédant aujourd'hui (aujourd'hui exclu), de 0 à 1.
 * Les jours antérieurs à la première entrée du journal ne sont ni validés ni comptés ;
 * 0 si aucun jour suivi n'est antérieur à aujourd'hui.
 * @param {Object<string,import('./types.js').DayRecord>} dayLog
 * @param {string} today
 * @param {number} [n]
 * @returns {number}
 */
export function regularity(dayLog, today, n = 30) {
  const days = Object.keys(dayLog);
  if (n <= 0 || days.length === 0) return 0;
  const first = days.reduce((a, b) => (a < b ? a : b));
  let ok = 0;
  let tracked = 0;
  for (let i = 1; i <= n; i++) {
    const day = addDays(today, -i);
    if (day < first) break;
    tracked++;
    if (validated(dayLog[day])) ok++;
  }
  return tracked === 0 ? 0 : ok / tracked;
}

/** Thumuns acquis, avec leur id. */
function acquired(state) {
  return Object.entries(state.thumuns).filter(([, t]) => t.status === 'acquis');
}

/**
 * Répartition des thumuns acquis par difficulté.
 * @param {AppState} state
 * @returns {{difficile:number,moyen:number,facile:number}}
 */
export function distribution(state) {
  const out = { difficile: 0, moyen: 0, facile: 0 };
  for (const [, t] of acquired(state)) out[difficulty(t)]++;
  return out;
}

/** Dernière note vs moyenne des (jusqu'à 4) notes précédentes. */
function trendOf(scores) {
  if (scores.length < 2) return 'flat';
  const last = scores[scores.length - 1];
  const avg = mean(scores.slice(-5, -1));
  if (last > avg) return 'up';
  if (last < avg) return 'down';
  return 'flat';
}

/**
 * Les `n` thumuns acquis les plus fragiles (moyenne des 5 dernières notes croissante).
 * @param {AppState} state
 * @param {number} [n]
 * @returns {{id:string,last:number,trend:'up'|'down'|'flat'}[]}
 */
export function topFragile(state, n = 10) {
  return acquired(state)
    .filter(([, t]) => t.scores.some((s) => !s.seed)) // les notes de départ seules ne disent rien
    .map(([id, t]) => {
      const scores = t.scores.map((s) => s.score);
      return { id, avg: mean(scores.slice(-5)), last: scores[scores.length - 1], trend: trendOf(scores) };
    })
    .sort((a, b) => a.avg - b.avg || (a.id < b.id ? -1 : 1))
    .slice(0, n)
    .map(({ id, last, trend }) => ({ id, last, trend }));
}

/**
 * Durée réelle d'un cycle de base en jours : hizbs acquis ÷ hizbs de base révisés par jour
 * en moyenne sur les jours suivis des 14 derniers (aujourd'hui exclu ; comme `regularity`, les
 * jours antérieurs à la première entrée de dayLog ne comptent pas). `null` si rien n'a été révisé.
 * @param {AppState} state
 * @param {string} today
 * @returns {number|null}
 */
export function actualCycleDays(state, today) {
  const days = Object.keys(state.dayLog);
  if (days.length === 0) return null;
  const first = days.reduce((a, b) => (a < b ? a : b));
  const window = Math.min(14, diffDays(today, first));
  if (window < 1) return null;
  const hizbsByDay = new Map();
  for (const e of state.journal) {
    if (e.pilier !== 'revision' || e.source !== 'base') continue;
    const age = diffDays(today, e.date);
    if (age < 1 || age > window) continue;
    if (!hizbsByDay.has(e.date)) hizbsByDay.set(e.date, new Set());
    hizbsByDay.get(e.date).add(e.thumunId.slice(1, 3));
  }
  let total = 0;
  for (const set of hizbsByDay.values()) total += set.size;
  const avg = total / window;
  if (avg === 0) return null;
  return Math.round(acquired(state).length / 8 / avg);
}

/**
 * Carte de chaleur des 60 hizbs : solidité (moyenne de la dernière note de chaque thumun
 * acquis) et ancienneté de la plus vieille révision ; `null` si aucun thumun acquis.
 * @param {AppState} state
 * @param {string} today
 * @returns {{hizb:number,solidity:number|null,ageDays:number|null}[]}
 */
export function hizbHeat(state, today) {
  const rows = [];
  for (let hizb = 1; hizb <= 60; hizb++) {
    const lasts = [];
    const reviewed = [];
    for (let n = 1; n <= 8; n++) {
      const t = state.thumuns[`H${pad2(hizb)}-T${n}`];
      if (!t || t.status !== 'acquis') continue;
      if (t.scores.length > 0) lasts.push(t.scores[t.scores.length - 1].score);
      if (t.lastReviewed) reviewed.push(t.lastReviewed);
    }
    rows.push({
      hizb,
      solidity: lasts.length ? mean(lasts) : null,
      ageDays: reviewed.length ? diffDays(today, reviewed.reduce((a, b) => (a < b ? a : b))) : null,
    });
  }
  return rows;
}
