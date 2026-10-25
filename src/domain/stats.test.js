import { describe, it, expect } from 'vitest';
import { streak, regularity, distribution, topFragile, actualCycleDays, hizbHeat } from './stats.js';
import { addDays } from './dates.js';
import { DEFAULT_PARAMS } from './params.js';
import { makeState } from '../test/fixtures.js';

const TODAY = '2026-10-25';
const ok = { planned: 5, done: 5 };

function logFor(offsets) {
  const log = {};
  for (const o of offsets) log[addDays(TODAY, o)] = { ...ok };
  return log;
}

describe('streak', () => {
  it('5 validés, 1 manqué pardonné, 3 validés : 8', () => {
    const log = logFor([-1, -2, -3, -4, -5, -7, -8, -9]);
    expect(streak(log, TODAY, DEFAULT_PARAMS)).toBe(8);
  });

  it('deux manqués à moins de 7 jours : la série s’arrête au second', () => {
    const log = logFor([-1, -2, -3, -4, -5, -7, -8, -9, -11, -12]);
    log[addDays(TODAY, -10)] = { planned: 5, done: 2 };
    expect(streak(log, TODAY, DEFAULT_PARAMS)).toBe(8);
  });

  it('aujourd’hui compte seulement s’il est validé', () => {
    const log = logFor([0, -1, -2]);
    expect(streak(log, TODAY, DEFAULT_PARAMS)).toBe(3);
    log[TODAY] = { planned: 5, done: 3 };
    expect(streak(log, TODAY, DEFAULT_PARAMS)).toBe(2);
  });

  it('la série se termine à la première entrée du journal, même avec une grâce illimitée', () => {
    expect(streak(logFor([-1]), TODAY, { ...DEFAULT_PARAMS, graceDaysPerWeek: 99 })).toBe(1);
    expect(streak({}, TODAY, DEFAULT_PARAMS)).toBe(0);
  });

  it('un jour planned = 0 n’est pas validé (mais peut être pardonné)', () => {
    const log = logFor([-1, -3]);
    log[addDays(TODAY, -2)] = { planned: 0, done: 0 };
    expect(streak(log, TODAY, DEFAULT_PARAMS)).toBe(2);
  });

  it('sans jour de grâce, un manqué coupe la série', () => {
    const log = logFor([-1, -2, -4]);
    expect(streak(log, TODAY, { ...DEFAULT_PARAMS, graceDaysPerWeek: 0 })).toBe(2);
  });
});

describe('regularity', () => {
  it('27 jours validés sur 30 : 0.9', () => {
    const offsets = [];
    for (let i = 1; i <= 30; i++) if (![3, 10, 20].includes(i)) offsets.push(-i);
    expect(regularity(logFor(offsets), TODAY)).toBeCloseTo(0.9, 10);
  });

  it('aujourd’hui est exclu de la fenêtre', () => {
    // Jours -1 et -3 validés, trou en -2 : 2/3 sur les jours suivis (3/4 si aujourd'hui était compté).
    const base = logFor([-1, -3]);
    expect(regularity(base, TODAY, 4)).toBeCloseTo(2 / 3, 10);
    expect(regularity({ ...base, [TODAY]: { ...ok } }, TODAY, 4)).toBeCloseTo(2 / 3, 10);
  });

  it('journal vide : 0 ; fenêtre configurable ; n <= 0 : 0', () => {
    expect(regularity({}, TODAY)).toBe(0);
    expect(regularity(logFor([-1, -2, -5, -6]), TODAY, 4)).toBe(0.5);
    expect(regularity(logFor([-1]), TODAY, 0)).toBe(0);
  });

  it('ignore les jours antérieurs à la première entrée du journal (ni validés ni comptés)', () => {
    // Suivi depuis 4 jours, tous validés : 4/4 et non 4/30.
    expect(regularity(logFor([-1, -2, -3, -4]), TODAY)).toBe(1);
    // Un jour manqué après la première entrée compte au dénominateur.
    expect(regularity(logFor([-1, -3, -4]), TODAY)).toBe(0.75);
  });

  it('aucun jour suivi avant aujourd’hui : 0', () => {
    expect(regularity({ [TODAY]: { ...ok } }, TODAY)).toBe(0);
    expect(regularity({ [addDays(TODAY, 1)]: { ...ok } }, TODAY)).toBe(0);
  });
});

const mk = (arr) => arr.map((score, i) => ({ date: addDays(TODAY, -10 + i), score }));

/** Trois thumuns acquis aux historiques [1,2], [3,3], [5,5,5]. */
function threeThumunState() {
  const s = makeState({ acquis: [1, 2, 3] });
  const hist = { 'H01-T1': [1, 2], 'H02-T1': [3, 3], 'H03-T1': [5, 5, 5] };
  for (const [id, t] of Object.entries(s.thumuns)) {
    if (id in hist) {
      t.scores = mk(hist[id]);
    } else {
      t.status = 'non_acquis';
      t.track = null;
      t.scores = [];
      t.lastReviewed = null;
    }
  }
  return s;
}

describe('distribution et topFragile', () => {
  it('compte les thumuns acquis par difficulté', () => {
    expect(distribution(threeThumunState())).toEqual({ difficile: 1, moyen: 1, facile: 1 });
  });

  it('trie par moyenne des 5 dernières notes croissante, avec last et trend', () => {
    const top = topFragile(threeThumunState());
    expect(top.map((x) => x.id)).toEqual(['H01-T1', 'H02-T1', 'H03-T1']);
    expect(top[0]).toEqual({ id: 'H01-T1', last: 2, trend: 'up' });
    expect(top[1]).toEqual({ id: 'H02-T1', last: 3, trend: 'flat' });
    expect(top[2]).toEqual({ id: 'H03-T1', last: 5, trend: 'flat' });
    expect(topFragile(threeThumunState(), 2)).toHaveLength(2);
  });

  it('trend : dernière note vs moyenne des 4 précédentes', () => {
    const s = threeThumunState();
    s.thumuns['H01-T1'].scores = mk([3, 3, 3, 3, 5]);
    s.thumuns['H02-T1'].scores = mk([5, 5, 5, 5, 2]);
    s.thumuns['H03-T1'].scores = mk([4, 4]);
    const byId = Object.fromEntries(topFragile(s).map((x) => [x.id, x]));
    expect(byId['H01-T1']).toMatchObject({ last: 5, trend: 'up' });
    expect(byId['H02-T1']).toMatchObject({ last: 2, trend: 'down' });
    expect(byId['H03-T1']).toMatchObject({ last: 4, trend: 'flat' });
  });

  it('ignore les thumuns non acquis', () => {
    expect(topFragile(makeState({}))).toEqual([]);
  });
});

describe('actualCycleDays', () => {
  const entry = (id, date, thumunId, pilier, source) => ({ id, date, thumunId, pilier, score: 4, source });

  it('hizbs acquis ÷ hizbs de base révisés par jour sur 14 jours', () => {
    const s = makeState({ acquis: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] }); // 80 thumuns acquis = 10 hizbs
    // 14 jours x 2 hizbs distincts (plusieurs thumuns d'un même hizb comptent une fois)
    for (let i = 1; i <= 14; i++) {
      const date = addDays(TODAY, -i);
      for (const id of ['H01-T1', 'H01-T2', 'H02-T3']) s.journal.push(entry(`${i}-${id}`, date, id, 'revision', 'base'));
    }
    // bruit ignoré : source cible, hifdh, aujourd'hui, hors fenêtre
    s.journal.push(entry('a', addDays(TODAY, -1), 'H05-T1', 'revision', 'cible'));
    s.journal.push(entry('b', addDays(TODAY, -1), 'H06-T1', 'hifdh', 'hifdh'));
    s.journal.push(entry('c', TODAY, 'H07-T1', 'revision', 'base'));
    s.journal.push(entry('d', addDays(TODAY, -15), 'H08-T1', 'revision', 'base'));
    expect(actualCycleDays(s, TODAY)).toBe(5); // 10 / 2
  });

  it('arrondit, et renvoie null sans révision de base', () => {
    const s = makeState({ acquis: [1, 2, 3] });
    expect(actualCycleDays(s, TODAY)).toBeNull();
    s.journal.push(entry('x', addDays(TODAY, -1), 'H01-T1', 'revision', 'base'));
    // moyenne = 1/14 hizb par jour ; 3 / (1/14) = 42
    expect(actualCycleDays(s, TODAY)).toBe(42);
  });
});

describe('hizbHeat', () => {
  it('renvoie 60 lignes, null pour un hizb non acquis', () => {
    const s = makeState({ acquis: [2] });
    for (let n = 1; n <= 8; n++) {
      s.thumuns[`H02-T${n}`].scores = mk([3]);
      s.thumuns[`H02-T${n}`].lastReviewed = addDays(TODAY, -2);
    }
    s.thumuns['H02-T1'].scores = mk([5]);
    s.thumuns['H02-T2'].lastReviewed = addDays(TODAY, -9);
    const heat = hizbHeat(s, TODAY);
    expect(heat).toHaveLength(60);
    expect(heat[0]).toEqual({ hizb: 1, solidity: null, ageDays: null });
    expect(heat[1].hizb).toBe(2);
    expect(heat[1].solidity).toBeCloseTo((5 + 7 * 3) / 8, 10);
    expect(heat[1].ageDays).toBe(9);
  });

  it('un hizb partiellement acquis ne compte que ses thumuns acquis', () => {
    const s = makeState({});
    s.thumuns['H03-T4'] = { ...s.thumuns['H03-T4'], status: 'acquis', track: 'cible', scores: mk([2, 4]), lastReviewed: addDays(TODAY, -3) };
    const row = hizbHeat(s, TODAY)[2];
    expect(row).toEqual({ hizb: 3, solidity: 4, ageDays: 3 });
  });
});
