import { describe, it, expect } from 'vitest';
import { forecast } from './forecast.js';
import { buildDailyPlan } from './plan.js';
import { DEFAULT_PARAMS as P } from './params.js';
import { addDays } from './dates.js';
import { makeRefs, makeState } from '../test/fixtures.js';

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

  it('ne modifie pas l\'état d\'entrée', () => {
    const s = makeState({ acquis: range(1, 25) });
    const before = JSON.stringify(s);
    forecast(s, refs, DAY, 7, P);
    expect(JSON.stringify(s)).toBe(before);
  });
});
