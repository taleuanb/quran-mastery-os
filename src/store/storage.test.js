import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_PARAMS } from '../domain/params.js';
import { makeRefs, makeState } from '../test/fixtures.js';
import {
  backupDue,
  createInitialState,
  exportState,
  importState,
  loadState,
  migrate,
  saveState,
} from './storage.js';

const refs = makeRefs();
const UNREADABLE = "Fichier illisible : ce n'est pas une sauvegarde Quran Mastery OS";

beforeEach(() => localStorage.clear());

describe('createInitialState', () => {
  it("crée 480 thumuns non acquis dans l'ordre des refs", () => {
    const s = createInitialState(refs);
    const ids = Object.keys(s.thumuns);
    expect(ids).toEqual(refs.map((r) => r.id));
    expect(ids).toHaveLength(480);
    expect(s.thumuns['H01-T1']).toEqual({
      status: 'non_acquis', track: null, scores: [], lastReviewed: null,
      interval: 0, due: null, risk: false, fragileInitial: false,
    });
    expect(s).toMatchObject({
      schemaVersion: 1, journal: [], learnQueue: [], dayLog: {}, lastBackup: null, khatma: 0,
    });
    expect(s.params).toEqual(DEFAULT_PARAMS);
  });

  it('copie les paramètres en profondeur', () => {
    const params = { ...DEFAULT_PARAMS, restDays: [1], multipliers: { 5: 9 } };
    const s = createInitialState(refs, params);
    params.restDays.push(2);
    params.multipliers[5] = 1;
    expect(s.params.restDays).toEqual([1]);
    expect(s.params.multipliers).toEqual({ 5: 9 });
  });
});

describe('saveState / loadState', () => {
  it('aller-retour via localStorage', () => {
    const s = makeState({ acquis: [1, 2] });
    saveState(s);
    expect(JSON.parse(localStorage.getItem('qmos.state'))).toEqual(s);
    expect(loadState(refs)).toEqual(s);
  });

  it('clé absente : état initial', () => {
    expect(loadState(refs)).toEqual(createInitialState(refs));
  });

  it('JSON illisible : état initial de 480 thumuns, sans exception', () => {
    localStorage.setItem('qmos.state', '{oops');
    const s = loadState(refs);
    expect(Object.keys(s.thumuns)).toHaveLength(480);
    expect(s).toEqual(createInitialState(refs));
  });

  it('version inconnue : état initial', () => {
    localStorage.setItem('qmos.state', JSON.stringify({ schemaVersion: 9 }));
    expect(loadState(refs)).toEqual(createInitialState(refs));
  });

  it('saveState ne lève jamais', () => {
    const orig = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new Error('quota'); };
    try {
      expect(() => saveState(makeState())).not.toThrow();
    } finally {
      Storage.prototype.setItem = orig;
    }
  });
});

describe('migrate', () => {
  it("v1 est l'identité", () => {
    const s = makeState();
    expect(migrate(s)).toEqual(s);
  });

  it('version inconnue lève', () => {
    expect(() => migrate({ schemaVersion: 9 })).toThrow('Version de sauvegarde non reconnue');
  });
});

describe('exportState / importState', () => {
  it("aller-retour égal à l'état, JSON indenté", () => {
    const s = makeState({ acquis: [3, 4] });
    const text = exportState(s);
    expect(text).toContain('\n  ');
    expect(importState(text)).toEqual(s);
  });

  it.each([
    ['tableau', '[]'],
    ['JSON invalide', '{oops'],
    ['null', 'null'],
    ['chaîne vide', ''],
  ])('%s : message exact', (_n, text) => {
    expect(() => importState(text)).toThrow(UNREADABLE);
  });

  it('ids inconnus ou manquants : message exact', () => {
    const extra = makeState();
    extra.thumuns['H99-T9'] = extra.thumuns['H01-T1'];
    expect(() => importState(JSON.stringify(extra))).toThrow(UNREADABLE);

    const missing = makeState();
    delete missing.thumuns['H60-T8'];
    expect(() => importState(JSON.stringify(missing))).toThrow(UNREADABLE);

    const noThumuns = makeState();
    delete noThumuns.thumuns;
    expect(() => importState(JSON.stringify(noThumuns))).toThrow(UNREADABLE);
  });

  it('version inconnue : message de version', () => {
    const s = { ...makeState(), schemaVersion: 9 };
    expect(() => importState(JSON.stringify(s))).toThrow('Version de sauvegarde non reconnue');
  });
});

describe('backupDue', () => {
  const today = '2026-10-25';
  it('vrai si jamais sauvegardé', () => {
    expect(backupDue({ ...makeState(), lastBackup: null }, today)).toBe(true);
  });
  it('vrai à 8 jours, faux à 3 et à 7', () => {
    expect(backupDue({ ...makeState(), lastBackup: '2026-10-17' }, today)).toBe(true);
    expect(backupDue({ ...makeState(), lastBackup: '2026-10-22' }, today)).toBe(false);
    expect(backupDue({ ...makeState(), lastBackup: '2026-10-18' }, today)).toBe(false);
  });
  it('respecte backupReminderDays', () => {
    const s = makeState({ params: { backupReminderDays: 2 } });
    expect(backupDue({ ...s, lastBackup: '2026-10-22' }, today)).toBe(true);
  });
});
