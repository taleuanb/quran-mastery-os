import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { reducer } from './reducer.js';
import { useAppStore } from './useAppStore.js';
import { makeRefs, makeState } from '../test/fixtures.js';
import { createInitialState } from './storage.js';
import { DEFAULT_PARAMS } from '../domain/params.js';

const DAY = '2026-10-25';
const hizbIds = (h) => Array.from({ length: 8 }, (_, i) => `H${String(h).padStart(2, '0')}-T${i + 1}`);
const fresh = () => createInitialState(makeRefs(), DEFAULT_PARAMS);
const allAt = (h, v) => Object.fromEntries(hizbIds(h).map((id) => [id, v]));
const persisted = ({ _undo, ...rest }) => rest;

describe('SET_ACQUIS', () => {
  it('8 thumuns du hizb 3 -> 8 acquis base, seed 3', () => {
    const s = reducer(fresh(), { type: 'SET_ACQUIS', changes: allAt(3, 1), day: DAY });
    for (const id of hizbIds(3)) {
      expect(s.thumuns[id]).toMatchObject({ status: 'acquis', track: 'base', interval: 0, due: null, fragileInitial: false });
      expect(s.thumuns[id].scores).toEqual([{ date: DAY, score: 3, seed: true }]);
    }
  });

  it('un thumun à 2 -> ciblé, fragile, due = jour', () => {
    const s = reducer(fresh(), { type: 'SET_ACQUIS', changes: { ...allAt(3, 1), 'H03-T4': 2 }, day: DAY });
    expect(s.thumuns['H03-T4']).toMatchObject({ status: 'acquis', track: 'cible', interval: 2, due: DAY, fragileInitial: true });
    expect(s.thumuns['H03-T4'].scores).toEqual([{ date: DAY, score: 2, seed: true }]);
    expect(s.thumuns['H03-T3'].track).toBe('base');
  });

  it('0 remet à non acquis', () => {
    const a = reducer(fresh(), { type: 'SET_ACQUIS', changes: allAt(3, 1), day: DAY });
    const b = reducer(a, { type: 'SET_ACQUIS', changes: { 'H03-T1': 0 }, day: DAY });
    expect(b.thumuns['H03-T1']).toEqual(fresh().thumuns['H03-T1']);
  });

  it('étale lastReviewed des hizbs nouvellement acquis, le plus petit numéro le plus ancien', () => {
    const s = reducer(fresh(), { type: 'SET_ACQUIS', changes: { ...allAt(1, 1), ...allAt(2, 1), ...allAt(3, 1) }, day: DAY });
    const expected = makeState({ acquis: [1, 2, 3], day: DAY });
    for (const h of [1, 2, 3]) {
      expect(s.thumuns[`H0${h}-T1`].lastReviewed).toBe(expected.thumuns[`H0${h}-T1`].lastReviewed);
    }
    expect(s.thumuns['H01-T1'].lastReviewed < s.thumuns['H03-T1'].lastReviewed).toBe(true);
  });
});

describe('REVIEW_HIZB', () => {
  const withFive = () => reducer(fresh(), {
    type: 'SET_ACQUIS',
    changes: Object.fromEntries(hizbIds(3).slice(0, 5).map((id) => [id, 1])),
    day: DAY,
  });

  it('5 thumuns acquis -> exactement 5 entrées de journal revision', () => {
    const s = reducer(withFive(), { type: 'REVIEW_HIZB', hizb: 3, day: DAY, overrides: {} });
    expect(s.journal).toHaveLength(5);
    expect(s.journal.every((e) => e.pilier === 'revision' && e.score === 4 && e.source === 'base' && e.date === DAY)).toBe(true);
    expect(new Set(s.journal.map((e) => e.id)).size).toBe(5);
    expect(s.dayLog[DAY].done).toBe(1);
  });

  it('override {H03-T6: 2} -> ciblé, les 7 autres restent base', () => {
    const a = reducer(fresh(), { type: 'SET_ACQUIS', changes: allAt(3, 1), day: DAY });
    const s = reducer(a, { type: 'REVIEW_HIZB', hizb: 3, day: DAY, overrides: { 'H03-T6': 2 } });
    expect(s.thumuns['H03-T6'].track).toBe('cible');
    expect(hizbIds(3).filter((id) => id !== 'H03-T6').every((id) => s.thumuns[id].track === 'base')).toBe(true);
    expect(s.journal.find((e) => e.thumunId === 'H03-T6')).toMatchObject({ score: 2, source: 'base' });
  });

  it('UNDO après REVIEW_HIZB -> état identique à l’avant', () => {
    const before = reducer(fresh(), { type: 'SET_ACQUIS', changes: allAt(3, 1), day: DAY });
    const after = reducer(before, { type: 'REVIEW_HIZB', hizb: 3, day: DAY, overrides: {} });
    expect(after.journal).toHaveLength(8);
    const undone = reducer(after, { type: 'UNDO' });
    expect(persisted(undone)).toEqual(persisted(before));
    expect(undone._undo).toBeUndefined();
    expect(reducer(undone, { type: 'UNDO' })).toBe(undone);
  });
});

describe('notation unitaire', () => {
  const seeded = () => reducer(fresh(), { type: 'SET_ACQUIS', changes: allAt(3, 1), day: DAY });

  it('SCORE_THUMUN note et journalise avec la piste', () => {
    const s = reducer(seeded(), { type: 'SCORE_THUMUN', id: 'H03-T1', score: 2, day: DAY });
    expect(s.thumuns['H03-T1'].track).toBe('cible');
    expect(s.journal[0]).toMatchObject({ thumunId: 'H03-T1', pilier: 'revision', score: 2, source: 'base' });
  });

  it('LEARN journalise hifdh et rend le thumun acquis ciblé', () => {
    const s = reducer(fresh(), { type: 'LEARN', id: 'H05-T1', score: 4, day: DAY });
    expect(s.thumuns['H05-T1']).toMatchObject({ status: 'acquis', track: 'cible' });
    expect(s.journal[0]).toMatchObject({ pilier: 'hifdh', source: 'hifdh', score: 4 });
  });

  it('MARK_FORGOTTEN -> note 1, ciblé, risk', () => {
    const s = reducer(seeded(), { type: 'MARK_FORGOTTEN', id: 'H03-T2', day: DAY });
    expect(s.thumuns['H03-T2']).toMatchObject({ track: 'cible', risk: true });
    expect(s.journal[0].score).toBe(1);
  });

  it('UNDO annule une note unitaire mais garde les réglages faits entre-temps', () => {
    const a = reducer(seeded(), { type: 'SCORE_THUMUN', id: 'H03-T1', score: 2, day: DAY });
    const b = reducer(a, { type: 'SET_PARAMS', patch: { dailyReviewHizbs: 7 } });
    const c = reducer(b, { type: 'UNDO' });
    expect(c.thumuns['H03-T1'].track).toBe('base');
    expect(c.journal).toHaveLength(0);
    expect(c.params.dailyReviewHizbs).toBe(7);
  });
});

describe('EDIT_ENTRY', () => {
  it('4 -> 1 : le thumun est ciblé avec risk', () => {
    const a = reducer(fresh(), { type: 'SET_ACQUIS', changes: allAt(3, 1), day: DAY });
    const b = reducer(a, { type: 'REVIEW_HIZB', hizb: 3, day: DAY, overrides: {} });
    expect(b.thumuns['H03-T5']).toMatchObject({ track: 'base', risk: false });
    const entry = b.journal.find((e) => e.thumunId === 'H03-T5');
    const c = reducer(b, { type: 'EDIT_ENTRY', entryId: entry.id, score: 1 });
    expect(c.thumuns['H03-T5']).toMatchObject({ track: 'cible', risk: true });
    expect(c.journal.find((e) => e.id === entry.id).score).toBe(1);
    expect(c.thumuns['H03-T6'].track).toBe('base');
  });

  it('rejoue depuis le seed fragile (2) et depuis une entrée hifdh', () => {
    const a = reducer(fresh(), { type: 'SET_ACQUIS', changes: { 'H01-T1': 2 }, day: DAY });
    const b = reducer(a, { type: 'SCORE_THUMUN', id: 'H01-T1', score: 4, day: '2026-10-27' });
    const c = reducer(b, { type: 'EDIT_ENTRY', entryId: b.journal[0].id, score: 5 });
    expect(c.thumuns['H01-T1'].fragileInitial).toBe(true);
    expect(c.thumuns['H01-T1'].scores).toEqual([
      { date: DAY, score: 2, seed: true },
      { date: '2026-10-27', score: 5 },
    ]);
    const l = reducer(fresh(), { type: 'LEARN', id: 'H05-T1', score: 4, day: DAY });
    const m = reducer(l, { type: 'EDIT_ENTRY', entryId: l.journal[0].id, score: 2 });
    expect(m.thumuns['H05-T1']).toMatchObject({ status: 'acquis', track: 'cible', interval: 2 });
  });

  it('entrée inconnue : état inchangé', () => {
    const s = fresh();
    expect(reducer(s, { type: 'EDIT_ENTRY', entryId: 'nope', score: 3 })).toBe(s);
  });
});

describe('actions simples', () => {
  it('SET_PARAMS, SET_LEARN_QUEUE, SET_PLANNED, MARK_BACKUP, KHATMA_INC, IMPORT', () => {
    let s = fresh();
    s = reducer(s, { type: 'SET_PARAMS', patch: { dailyNewThumuns: 2 } });
    expect(s.params.dailyNewThumuns).toBe(2);
    s = reducer(s, { type: 'SET_LEARN_QUEUE', ids: ['H10-T1'] });
    expect(s.learnQueue).toEqual(['H10-T1']);
    s = reducer(s, { type: 'SET_PLANNED', day: DAY, planned: 5 });
    expect(s.dayLog[DAY]).toEqual({ planned: 5, done: 0 });
    s = reducer(s, { type: 'MARK_BACKUP', day: DAY });
    expect(s.lastBackup).toBe(DAY);
    s = reducer(s, { type: 'KHATMA_INC' });
    expect(s.khatma).toBe(1);
    const other = fresh();
    expect(reducer(s, { type: 'IMPORT', state: other })).toBe(other);
  });
});

describe('useAppStore', () => {
  beforeEach(() => localStorage.clear());

  it('persiste l’état sans le champ d’annulation et expose today', () => {
    const refs = makeRefs();
    const { result } = renderHook(() => useAppStore(refs));
    expect(result.current.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    act(() => result.current.dispatch({ type: 'LEARN', id: 'H05-T1', score: 4, day: result.current.today }));
    expect(result.current.state._undo).toBeDefined();
    const saved = JSON.parse(localStorage.getItem('qmos.state'));
    expect(saved.journal).toHaveLength(1);
    expect(saved._undo).toBeUndefined();
    expect(result.current.refs).toHaveLength(480);
  });
});
