import { describe, it, expect } from 'vitest';
import { buildDailyPlan, nextLearnThumuns } from './plan.js';
import { DEFAULT_PARAMS as P } from './params.js';
import { addDays } from './dates.js';
import { makeRefs, makeState } from '../test/fixtures.js';

const DAY = '2026-10-25'; // dimanche
const refs = makeRefs();
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const sc = (...scores) => scores.map((score) => ({ date: '2026-10-01', score }));
const nums = (plan) => plan.hizbs.map((h) => h.hizb);

describe('buildDailyPlan', () => {
  it('25 hizbs acquis, aucun ciblé, quota 5 : les 5 plus anciens en base', () => {
    const plan = buildDailyPlan(makeState({ acquis: range(1, 25) }), refs, DAY, P);
    expect(plan.day).toBe(DAY);
    expect(nums(plan)).toEqual([1, 2, 3, 4, 5]);
    expect(plan.hizbs.every((h) => h.source === 'base' && !h.urgent && h.focus.length === 0)).toBe(true);
    expect(plan.baseCount).toBe(5);
    expect(plan.cibleCount).toBe(0);
    expect(plan.overflowCible).toBe(0);
  });

  it('ciblés échus dans les hizbs 2 et 30 : part de base 2, focus sur le hizb 2, hizb 30 en ciblé', () => {
    const state = makeState({
      acquis: range(1, 25),
      cible: {
        'H02-T3': { due: addDays(DAY, -1), scores: sc(3) },
        'H30-T1': { due: DAY, scores: sc(3) },
      },
    });
    const plan = buildDailyPlan(state, refs, DAY, P);
    expect(nums(plan)).toEqual([1, 2, 30, 3, 4]);
    expect(plan.hizbs[1]).toEqual({ hizb: 2, source: 'base', focus: ['H02-T3'], urgent: false });
    expect(plan.hizbs[2]).toEqual({ hizb: 30, source: 'cible', focus: ['H30-T1'], urgent: false });
    expect(plan.baseCount).toBe(4);
    expect(plan.cibleCount).toBe(1);
    expect(plan.overflowCible).toBe(0);
  });

  it('ciblé non échu : ignoré', () => {
    const state = makeState({ acquis: range(1, 25), cible: { 'H30-T1': { due: addDays(DAY, 1), scores: sc(3) } } });
    expect(nums(buildDailyPlan(state, refs, DAY, P))).toEqual([1, 2, 3, 4, 5]);
  });

  it('ciblé de note 1 en retard de 5 jours (hizb 40) : premier élément, urgent', () => {
    const state = makeState({
      acquis: range(1, 25),
      cible: {
        'H40-T2': { due: addDays(DAY, -5), scores: sc(1) },
        // priorité plus forte (10 x 2) mais pas urgent (note 3)
        'H50-T1': { due: addDays(DAY, -10), scores: sc(3) },
      },
    });
    const plan = buildDailyPlan(state, refs, DAY, P);
    expect(plan.hizbs[0]).toEqual({ hizb: 40, source: 'cible', focus: ['H40-T2'], urgent: true });
    expect(plan.hizbs.find((h) => h.hizb === 50)).toMatchObject({ source: 'cible', urgent: false });
  });

  it('ciblés triés par retard x poids, puis numéro de hizb', () => {
    const state = makeState({
      cible: {
        'H01-T1': { due: addDays(DAY, -2), scores: sc(4, 4, 4) }, // facile : 2 x 1 = 2
        'H02-T1': { due: addDays(DAY, -2), scores: sc(3) }, // moyen : 2 x 2 = 4
        'H03-T1': { due: addDays(DAY, -2), scores: sc(3, 3, 2, 2) }, // difficile : 2 x 3 = 6
        'H04-T1': { due: addDays(DAY, -1), scores: sc(4, 4, 4) }, // facile : 1
        'H05-T1': { due: DAY, scores: sc(1) }, // retard 0 : 0
        'H06-T1': { due: DAY, scores: sc(3) }, // retard 0 : 0
      },
    });
    const plan = buildDailyPlan(state, refs, DAY, P);
    expect(nums(plan)).toEqual([3, 2, 1, 4, 5]);
    expect(plan.overflowCible).toBe(1);
  });

  it('12 hizbs ciblés échus, quota 5 : 5 hizbs et overflowCible > 0', () => {
    const cible = {};
    for (const h of range(1, 12)) cible[`H${String(h).padStart(2, '0')}-T1`] = { due: DAY, scores: sc(3) };
    const plan = buildDailyPlan(makeState({ cible }), refs, DAY, P);
    expect(plan.hizbs.length).toBe(5);
    expect(nums(plan)).toEqual([1, 2, 3, 4, 5]);
    expect(plan.overflowCible).toBe(7);
    expect(plan.cibleCount).toBe(5);
  });

  it('acquis vide : aucun hizb, apprendre H01-T1', () => {
    const plan = buildDailyPlan(makeState(), refs, DAY, P);
    expect(plan.hizbs).toEqual([]);
    expect(plan.learn).toEqual(['H01-T1']);
    expect(plan.baseCount).toBe(0);
    expect(plan.cibleCount).toBe(0);
    expect(plan.overflowCible).toBe(0);
  });

  it('hizb présent en base et en ciblé : une seule entrée', () => {
    const state = makeState({
      acquis: range(1, 25),
      cible: {
        'H01-T5': { due: DAY, scores: sc(3) },
        'H01-T2': { due: addDays(DAY, -1), scores: sc(3) },
      },
    });
    const plan = buildDailyPlan(state, refs, DAY, P);
    expect(plan.hizbs.filter((h) => h.hizb === 1)).toEqual([
      { hizb: 1, source: 'base', focus: ['H01-T2', 'H01-T5'], urgent: false },
    ]);
    expect(plan.hizbs.length).toBe(5);
  });

  it('hizb urgent aussi présent en base : une seule entrée, ciblée et urgente', () => {
    const state = makeState({ acquis: range(1, 25), cible: { 'H01-T2': { due: addDays(DAY, -5), scores: sc(2) } } });
    const plan = buildDailyPlan(state, refs, DAY, P);
    expect(plan.hizbs.filter((h) => h.hizb === 1)).toEqual([
      { hizb: 1, source: 'cible', focus: ['H01-T2'], urgent: true },
    ]);
    expect(nums(plan)).toEqual([1, 2, 3, 4, 5]);
  });

  it('absence de 30 jours : toujours 5 hizbs, urgents en tête', () => {
    const old = '2026-09-25';
    const state = makeState({
      acquis: range(1, 25),
      day: old,
      cible: {
        'H45-T1': { due: addDays(old, 2), scores: sc(2) },
        'H40-T1': { due: addDays(old, 2), scores: sc(2) },
      },
    });
    const plan = buildDailyPlan(state, refs, DAY, P);
    expect(plan.hizbs.length).toBe(5);
    expect(plan.hizbs.slice(0, 2).map((h) => [h.hizb, h.urgent])).toEqual([[40, true], [45, true]]);
    expect(nums(plan)).toEqual([40, 45, 1, 2, 3]);
  });
});

describe('apprentissage du jour', () => {
  it('jeudi (jour de repos) : rien à apprendre', () => {
    expect(buildDailyPlan(makeState(), refs, '2026-10-29', P).learn).toEqual([]);
  });

  it('liste d\'apprentissage prioritaire', () => {
    const state = { ...makeState(), learnQueue: ['H30-T1'] };
    expect(buildDailyPlan(state, refs, DAY, P).learn).toEqual(['H30-T1']);
  });

  it('liste d\'apprentissage : les thumuns déjà acquis sont ignorés', () => {
    const state = { ...makeState({ acquis: [30] }), learnQueue: ['H30-T1', 'H31-T4'] };
    expect(nextLearnThumuns(state, refs, DAY, P)).toEqual(['H31-T4']);
  });

  it('sinon le non acquis qui suit le dernier thumun appris (journal hifdh)', () => {
    const state = makeState({ cible: { 'H10-T1': { due: DAY }, 'H05-T3': { due: DAY }, 'H05-T4': { due: DAY } } });
    state.journal = [
      { id: 'a', date: '2026-10-22', thumunId: 'H10-T1', pilier: 'hifdh', score: 4, source: 'hifdh' },
      { id: 'b', date: '2026-10-24', thumunId: 'H05-T3', pilier: 'hifdh', score: 4, source: 'hifdh' },
      { id: 'c', date: '2026-10-24', thumunId: 'H01-T1', pilier: 'revision', score: 4, source: 'base' },
    ];
    expect(nextLearnThumuns(state, refs, DAY, P)).toEqual(['H05-T5']);
  });

  it('dernier appris : à date égale, la dernière entrée du journal l\'emporte', () => {
    const state = makeState({ cible: { 'H10-T1': { due: DAY }, 'H05-T3': { due: DAY } } });
    state.journal = [
      { id: 'b', date: '2026-10-24', thumunId: 'H05-T3', pilier: 'hifdh', score: 4, source: 'hifdh' },
      { id: 'a', date: '2026-10-24', thumunId: 'H10-T1', pilier: 'hifdh', score: 4, source: 'hifdh' },
    ];
    expect(nextLearnThumuns(state, refs, DAY, P)).toEqual(['H10-T2']);
  });

  it('rien après le dernier appris : le premier non acquis', () => {
    const state = makeState({ acquis: [1], cible: { 'H60-T8': { due: DAY } } });
    state.journal = [{ id: 'a', date: '2026-10-24', thumunId: 'H60-T8', pilier: 'hifdh', score: 4, source: 'hifdh' }];
    expect(nextLearnThumuns(state, refs, DAY, P)).toEqual(['H02-T1']);
  });

  it('dailyNewThumuns : complète la liste puis prend les suivants', () => {
    const state = { ...makeState({ acquis: [1] }), learnQueue: ['H30-T1'] };
    expect(nextLearnThumuns(state, refs, DAY, { ...P, dailyNewThumuns: 3 })).toEqual(['H30-T1', 'H02-T1', 'H02-T2']);
  });
});
