import { cycleDays } from './params.js';
import { diffDays, weekday } from './dates.js';
import { difficulty } from './scoring.js';

/** @typedef {import('./types.js').AppState} AppState */
/** @typedef {import('./types.js').Ref} Ref */
/** @typedef {import('./types.js').Params} Params */
/** @typedef {{hizb:number,source:'base'|'cible',focus:string[],urgent:boolean}} PlanHizb */
/** @typedef {{day:string,learn:string[],hizbs:PlanHizb[],baseCount:number,cibleCount:number,overflowCible:number}} DailyPlan */

const WEIGHT = { difficile: 3, moyen: 2, facile: 1 };

const pad2 = (n) => String(n).padStart(2, '0');
const hizbOf = (id) => Number(id.slice(1, 3));

/** Ids dans l'ordre hizb puis thumun (référentiel si fourni, sinon par formule). */
function orderedIds(refs) {
  if (refs) return refs.map((r) => r.id);
  const ids = [];
  for (let h = 1; h <= 60; h++) for (let t = 1; t <= 8; t++) ids.push(`H${pad2(h)}-T${t}`);
  return ids;
}

const isAcquis = (state, id) => state.thumuns[id]?.status === 'acquis';

/**
 * Thumuns à apprendre ce jour-là (spec section 9).
 * @param {AppState} state
 * @param {Ref[]} refs
 * @param {string} day
 * @param {Params} p
 * @returns {string[]}
 */
export function nextLearnThumuns(state, refs, day, p) {
  if (p.restDays.includes(weekday(day))) return [];
  const n = p.dailyNewThumuns;
  const picked = [];
  const take = (id) => {
    if (picked.length < n && !picked.includes(id) && !isAcquis(state, id)) picked.push(id);
  };

  for (const id of state.learnQueue) take(id);

  // Dernier thumun appris : plus récente entrée hifdh, à date égale la dernière du journal.
  let last = null;
  for (const e of state.journal) {
    if (e.pilier === 'hifdh' && (!last || e.date >= last.date)) last = e;
  }
  const ids = orderedIds(refs);
  const start = last ? ids.indexOf(last.thumunId) + 1 : 0;
  // Les non acquis qui suivent le dernier appris, puis à partir du premier.
  for (let i = 0; i < ids.length && picked.length < n; i++) take(ids[(start + i) % ids.length]);
  return picked;
}

/**
 * Liste du jour (spec section 8).
 * @param {AppState} state
 * @param {Ref[]} refs
 * @param {string} day
 * @param {Params} p
 * @returns {DailyPlan}
 */
export function buildDailyPlan(state, refs, day, p) {
  const quota = p.dailyReviewHizbs;
  const ids = orderedIds(refs);
  const acquis = ids.filter((id) => isAcquis(state, id));
  const baseShare = Math.min(quota, Math.ceil(acquis.length / 8 / cycleDays(p)));

  // Ciblés échus, triés par retard x poids puis numéro de hizb (puis ordre du référentiel).
  const due = acquis
    .filter((id) => {
      const t = state.thumuns[id];
      return t.track === 'cible' && t.due && t.due <= day;
    })
    .map((id, order) => {
      const t = state.thumuns[id];
      const retard = diffDays(day, t.due);
      const lastScore = t.scores.length ? t.scores[t.scores.length - 1].score : null;
      return {
        id,
        order,
        hizb: hizbOf(id),
        priority: retard * WEIGHT[difficulty(t)],
        urgent: lastScore !== null && lastScore <= 2 && retard > p.urgencyDays,
      };
    })
    .sort((a, b) => b.priority - a.priority || a.hizb - b.hizb || a.order - b.order);

  // Hizbs de base : au moins un thumun acquis en base, le plus ancien lastReviewed d'abord (null = plus ancien).
  const oldest = new Map();
  for (const id of acquis) {
    const t = state.thumuns[id];
    if (t.track !== 'base') continue;
    const h = hizbOf(id);
    const lr = t.lastReviewed ?? '';
    if (!oldest.has(h) || lr < oldest.get(h)) oldest.set(h, lr);
  }
  const baseHizbs = [...oldest.keys()].sort((a, b) =>
    oldest.get(a) < oldest.get(b) ? -1 : oldest.get(a) > oldest.get(b) ? 1 : a - b,
  );

  /** @type {PlanHizb[]} */
  const hizbs = [];
  const byHizb = new Map();
  const add = (hizb, source, urgent) => {
    const entry = { hizb, source, focus: [], urgent };
    hizbs.push(entry);
    byHizb.set(hizb, entry);
  };
  const full = () => hizbs.length >= quota;

  // 1. Urgents en tête.
  for (const c of due) {
    if (c.urgent && !byHizb.has(c.hizb) && !full()) add(c.hizb, 'cible', true);
  }

  // 2. Part de base.
  let taken = 0;
  for (const h of baseHizbs) {
    if (taken >= baseShare || full()) break;
    if (byHizb.has(h)) continue;
    add(h, 'base', false);
    taken++;
  }

  // 3. Ciblés : focus d'un hizb déjà présent, sinon nouvelle place s'il en reste.
  let overflowCible = 0;
  for (const c of due) {
    if (!byHizb.has(c.hizb)) {
      if (full()) {
        overflowCible++;
        continue;
      }
      add(c.hizb, 'cible', false);
    }
    byHizb.get(c.hizb).focus.push(c.id);
  }

  // 4. Places restantes : la base complète jusqu'au quota.
  for (const h of baseHizbs) {
    if (full()) break;
    if (!byHizb.has(h)) add(h, 'base', false);
  }

  for (const e of hizbs) e.focus.sort((a, b) => ids.indexOf(a) - ids.indexOf(b));

  return {
    day,
    learn: nextLearnThumuns(state, refs, day, p),
    hizbs,
    baseCount: hizbs.filter((e) => e.source === 'base').length,
    cibleCount: hizbs.filter((e) => e.source === 'cible').length,
    overflowCible,
  };
}
