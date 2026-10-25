import { describe, it, expect } from 'vitest';
import { hasPendingHizbs } from './App';
import { makeRefs, makeState } from './test/fixtures';

const TODAY = '2026-10-25';
const refs = makeRefs();
const withLog = (acquis, log) => {
  const s = makeState({ acquis });
  s.dayLog = log ? { [TODAY]: log } : {};
  return s;
};

describe('badge de l’onglet Aujourd’hui', () => {
  it('planned 5, done 2 : badge', () => {
    expect(hasPendingHizbs(withLog([1, 2, 3], { planned: 5, done: 2 }), TODAY, refs)).toBe(true);
  });
  it('planned 5, done 5 : pas de badge', () => {
    expect(hasPendingHizbs(withLog([1, 2, 3], { planned: 5, done: 5 }), TODAY, refs)).toBe(false);
  });
  it('dayLog absent avec acquis : badge (repli sur le plan)', () => {
    expect(hasPendingHizbs(withLog([1, 2, 3], null), TODAY, refs)).toBe(true);
  });
  it('dayLog absent sans acquis : pas de badge', () => {
    expect(hasPendingHizbs(withLog([], null), TODAY, refs)).toBe(false);
  });
});
