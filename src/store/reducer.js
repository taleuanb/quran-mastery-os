import { applyScore, learnThumun } from '../domain/scoring.js';
import { addDays } from '../domain/dates.js';
import { cycleDays } from '../domain/params.js';

/** @typedef {import('../domain/types.js').AppState} AppState */
/** @typedef {import('../domain/types.js').ThumunState} ThumunState */

const REVIEW_SCORE = 4;

const hizbOf = (id) => Number(id.slice(1, 3));
const hizbThumunIds = (hizb) => Array.from({ length: 8 }, (_, i) => `H${String(hizb).padStart(2, '0')}-T${i + 1}`);

/** @returns {ThumunState} */
function blankThumun(journalFrom = 0) {
  return { status: 'non_acquis', track: null, scores: [], lastReviewed: null, interval: 0, due: null, risk: false, fragileInitial: false, journalFrom };
}

/** @returns {ThumunState} */
function seededThumun(value, day, lastReviewed, journalFrom = 0) {
  if (value === 2) {
    return {
      status: 'acquis', track: 'cible', scores: [{ date: day, score: 2, seed: true }],
      lastReviewed: day, interval: 2, due: day, risk: false, fragileInitial: true, journalFrom,
    };
  }
  return {
    status: 'acquis', track: 'base', scores: [{ date: day, score: 3, seed: true }],
    lastReviewed, interval: 0, due: null, risk: false, fragileInitial: false, journalFrom,
  };
}

/** Entrées de journal : id déterministe (jour + rang), le journal ne fait que croître. */
const makeEntry = (journal, date, thumunId, pilier, score, source) => ({
  id: `${date}-${journal.length}`, date, thumunId, pilier, score, source,
});

function setAcquis(state, { changes, day }) {
  const thumuns = { ...state.thumuns };
  const newBaseHizbs = new Set();
  const baseIds = [];
  for (const [id, value] of Object.entries(changes)) {
    const prev = thumuns[id];
    if (!prev) continue;
    const from = state.journal.length;
    if (value === 0) {
      thumuns[id] = blankThumun(from);
    } else if (prev.status === 'acquis') {
      // Idempotent : un thumun déjà acquis garde son historique (l'oubli passe par MARK_FORGOTTEN).
    } else if (value === 2) {
      thumuns[id] = seededThumun(2, day, day, from);
    } else if (value === 1) {
      baseIds.push(id);
      newBaseHizbs.add(hizbOf(id));
    }
  }
  const cycle = Math.round(cycleDays(state.params));
  const sorted = [...newBaseHizbs].sort((a, b) => a - b);
  const lastByHizb = {};
  sorted.forEach((h, i) => {
    lastByHizb[h] = addDays(day, -cycle + Math.floor((i * cycle) / sorted.length));
  });
  for (const id of baseIds) thumuns[id] = seededThumun(1, day, lastByHizb[hizbOf(id)], state.journal.length);
  return { thumuns };
}

/** Applique une série de notes et mémorise de quoi annuler (une seule profondeur). */
function scored(state, day, notes) {
  const thumuns = { ...state.thumuns };
  const journal = [...state.journal];
  for (const { id, score, pilier } of notes) {
    const t = thumuns[id];
    if (pilier === 'hifdh') {
      thumuns[id] = learnThumun(t, score, day, state.params);
      journal.push(makeEntry(journal, day, id, 'hifdh', score, 'hifdh'));
    } else {
      thumuns[id] = applyScore(t, score, day, state.params);
      journal.push(makeEntry(journal, day, id, 'revision', score, t.track));
    }
  }
  return { thumuns, journal };
}

/**
 * Enregistrement du jour (Ruling 24) : `hizbs` = plan ordonné, `reviewed` = hizbs relus via REVIEW_HIZB.
 * Les anciennes entrées sans ces listes valent [].
 */
function dayRecord(state, day) {
  const log = state.dayLog[day];
  return { hizbs: log?.hizbs ?? [], reviewed: log?.reviewed ?? [] };
}

const withDayRecord = (state, day, hizbs, reviewed) => ({
  ...state.dayLog,
  [day]: { planned: hizbs.length, done: reviewed.length, hizbs, reviewed },
});

/**
 * Applique `next` en mémorisant de quoi annuler (une seule profondeur). `keep` garde le point
 * d'annulation déjà posé : une saisie faite de plusieurs actions s'annule d'un seul UNDO.
 */
const withUndo = (state, next, keep = false) => ({
  ...state,
  ...next,
  _undo: keep && state._undo ? state._undo : { thumuns: state.thumuns, journal: state.journal, dayLog: state.dayLog },
});

/** Reconstruit un thumun depuis son seed puis rejoue ses entrées de journal. */
function replay(thumun, entries, params) {
  const from = thumun.journalFrom ?? 0;
  const seed = thumun.scores.find((s) => s.seed);
  let t = seed ? seededThumun(seed.score === 2 ? 2 : 1, seed.date, seed.date, from) : blankThumun(from);
  for (const e of entries) {
    t = e.pilier === 'hifdh' ? learnThumun(t, e.score, e.date, params) : applyScore(t, e.score, e.date, params);
  }
  return t;
}

function editEntry(state, { entryId, score }) {
  const target = state.journal.find((e) => e.id === entryId);
  if (!target) return state;
  const journal = state.journal.map((e) => (e.id === entryId ? { ...e, score } : e));
  const from = state.thumuns[target.thumunId].journalFrom ?? 0;
  const entries = journal.filter((e, i) => i >= from && e.thumunId === target.thumunId);
  const thumuns = { ...state.thumuns, [target.thumunId]: replay(state.thumuns[target.thumunId], entries, state.params) };
  const { _undo, ...rest } = state;
  return { ...rest, thumuns, journal };
}

/**
 * @param {AppState & {_undo?: object}} state
 * @param {{type:string}} action
 * @returns {AppState & {_undo?: object}}
 */
export function reducer(state, action) {
  switch (action.type) {
    case 'SET_ACQUIS':
      return withUndo(state, setAcquis(state, action), action.keepUndo);

    case 'REVIEW_HIZB': {
      const { hizb, day, overrides = {} } = action;
      const notes = hizbThumunIds(hizb)
        .filter((id) => state.thumuns[id].status === 'acquis')
        .map((id) => ({ id, score: overrides[id] ?? REVIEW_SCORE, pilier: 'revision' }));
      const next = scored(state, day, notes);
      // Seul REVIEW_HIZB compte comme « fait » (jamais MARK_FORGOTTEN, SCORE_THUMUN ni LEARN).
      const { hizbs, reviewed } = dayRecord(state, day);
      const nextHizbs = hizbs.includes(hizb) ? hizbs : [...hizbs, hizb];
      const nextReviewed = reviewed.includes(hizb) ? reviewed : [...reviewed, hizb];
      return withUndo(state, { ...next, dayLog: withDayRecord(state, day, nextHizbs, nextReviewed) });
    }

    case 'SCORE_THUMUN':
      return withUndo(state, scored(state, action.day, [{ id: action.id, score: action.score, pilier: 'revision' }]));

    case 'LEARN':
      return withUndo(state, scored(state, action.day, [{ id: action.id, score: action.score, pilier: 'hifdh' }]));

    case 'MARK_FORGOTTEN':
      return withUndo(state, scored(state, action.day, [{ id: action.id, score: 1, pilier: 'revision' }]), action.keepUndo);

    case 'UNDO': {
      if (!state._undo) return state;
      const { _undo, ...rest } = state;
      return { ...rest, ..._undo };
    }

    case 'EDIT_ENTRY':
      return editEntry(state, action);

    case 'SET_PARAMS':
      return { ...state, params: { ...state.params, ...action.patch } };

    case 'SET_LEARN_QUEUE':
      return { ...state, learnQueue: [...action.ids] };

    case 'SET_DAY_PLAN': {
      // Garde `reviewed` ; un hizb relu absent de la nouvelle liste y reste, à sa place précédente.
      const { hizbs: old, reviewed } = dayRecord(state, action.day);
      const hizbs = [...new Set(action.hizbs)];
      for (const h of reviewed) {
        if (hizbs.includes(h)) continue;
        const at = old.indexOf(h);
        hizbs.splice(at < 0 ? hizbs.length : Math.min(at, hizbs.length), 0, h);
      }
      return { ...state, dayLog: withDayRecord(state, action.day, hizbs, reviewed) };
    }

    case 'MARK_BACKUP':
      return { ...state, lastBackup: action.day };

    case 'KHATMA_INC':
      return { ...state, khatma: state.khatma + 1 };

    case 'IMPORT':
      return action.state;

    default:
      return state;
  }
}
