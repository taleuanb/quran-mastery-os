import { describe, it, expect } from 'vitest';
import { forecast } from './forecast.js';
import { buildDailyPlan } from './plan.js';
import { DEFAULT_PARAMS as P } from './params.js';
import { addDays } from './dates.js';
import { makeRefs, makeState } from '../test/fixtures.js';
import { reducer } from '../store/reducer.js';

const DAY = '2026-10-25';
const refs = makeRefs();
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const baseOf = (plan) => plan.hizbs.filter((h) => h.source === 'base').map((h) => h.hizb);

describe('forecast', () => {
  const state = makeState({ acquis: range(1, 25) });
  const days = forecast(state, refs, DAY, 7, P);

  it('7 entrées, jours consécutifs', () => {
    expect(days).toHaveLength(7);
    expect(days.map((d) => d.day)).toEqual(range(0, 6).map((i) => addDays(DAY, i)));
  });

  it('jour 0 = plan réel, non prédit ; jours suivants prédits', () => {
    expect(days[0]).toEqual({ ...buildDailyPlan(state, refs, DAY, P), predicted: false });
    expect(days.slice(1).every((d) => d.predicted === true)).toBe(true);
  });

  it('la base tourne : base du jour 1 différente du jour 0', () => {
    expect(baseOf(days[0])).toEqual([1, 2, 3, 4, 5]);
    expect(baseOf(days[1])).toEqual([6, 7, 8, 9, 10]);
  });

  it('l\'apprentissage avance d\'un jour à l\'autre', () => {
    expect(days[0].learn).toEqual(['H26-T1']);
    expect(days[1].learn).toEqual(['H26-T2']);
  });

  it('le thumun appris revient en ciblé à son échéance', () => {
    // appris le jour 0 avec la note 4 : intervalle 3 x 2 = 6 jours
    expect(days[6].hizbs.find((h) => h.hizb === 26)).toMatchObject({ source: 'cible', focus: ['H26-T1'] });
  });

  it('note tous les thumuns acquis d\'un hizb planifié, y compris un ciblé non échu', () => {
    // H01-T3 ciblé, échu dans 5 jours ; le hizb 1 est planifié à J0 (base).
    const s = makeState({
      acquis: [1],
      cible: { 'H01-T3': { due: addDays(DAY, 5), interval: 3, scores: [{ date: DAY, score: 3 }] } },
    });
    const plan = forecast(s, refs, DAY, 6, P);
    expect(plan[0].hizbs.map((h) => h.hizb)).toEqual([1]);
    expect(plan[0].hizbs[0].focus).toEqual([]);
    // Noté 4 à J0 : intervalle 6, nouvelle échéance J6 (et non plus J5).
    expect(plan[5].hizbs.flatMap((h) => h.focus)).not.toContain('H01-T3');
  });

  it('ne modifie pas l\'état d\'entrée', () => {
    const s = makeState({ acquis: range(1, 25) });
    const before = JSON.stringify(s);
    forecast(s, refs, DAY, 7, P);
    expect(JSON.stringify(s)).toBe(before);
  });
});

describe('forecast avec l’enregistrement du jour (Ruling 24)', () => {
  const start = makeState({ acquis: range(1, 25) });
  const planHizbs = buildDailyPlan(start, refs, DAY, P).hizbs.map((h) => h.hizb);
  const planned = reducer(start, { type: 'SET_DAY_PLAN', day: DAY, hizbs: planHizbs });
  const reviewed = [planHizbs[0], planHizbs[1]].reduce(
    (s, hizb) => reducer(s, { type: 'REVIEW_HIZB', hizb, day: DAY, overrides: {} }),
    planned,
  );

  it('jour 0 = l’enregistrement du jour (non recalculé), même après des révisions', () => {
    const f = forecast(reviewed, refs, DAY, 2, P);
    expect(f[0].hizbs.map((h) => h.hizb)).toEqual(planHizbs);
    expect(f[0].hizbs.map((h) => h.source)).toEqual(['base', 'base', 'base', 'base', 'base']);
    expect(f[0].predicted).toBe(false);
  });

  it('le lendemain ne dépend pas du nombre de hizbs déjà relus aujourd’hui', () => {
    const before = forecast(planned, refs, DAY, 3, P);
    const after = forecast(reviewed, refs, DAY, 3, P);
    expect(after[1].hizbs).toEqual(before[1].hizbs);
    expect(after[2].hizbs).toEqual(before[2].hizbs);
    expect(baseOf(after[1])).toEqual([6, 7, 8, 9, 10]);
  });

  it('un thumun déjà appris aujourd’hui n’est pas reproposé ni re-simulé au jour 0', () => {
    const learned = reducer(planned, { type: 'LEARN', id: 'H26-T1', score: 4, day: DAY });
    const f = forecast(learned, refs, DAY, 2, P);
    expect(f[0].learn).toEqual([]);
    expect(f[1].learn).toEqual(['H26-T2']);
  });
});
