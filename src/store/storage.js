import { DEFAULT_PARAMS } from '../domain/params.js';
import { diffDays } from '../domain/dates.js';

const STORAGE_KEY = 'qmos.state';
const UNREADABLE = "Fichier illisible : ce n'est pas une sauvegarde Quran Mastery OS";
const UNKNOWN_VERSION = 'Version de sauvegarde non reconnue';

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Les 480 identifiants de thumuns, H01-T1 à H60-T8, dans l'ordre. */
const THUMUN_IDS = [];
for (let hizb = 1; hizb <= 60; hizb++) {
  for (let thumun = 1; thumun <= 8; thumun++) {
    THUMUN_IDS.push(`H${String(hizb).padStart(2, '0')}-T${thumun}`);
  }
}

/**
 * @param {import('../domain/types.js').Ref[]} refs
 * @param {import('../domain/types.js').Params} [params]
 * @returns {import('../domain/types.js').AppState}
 */
export function createInitialState(refs, params = DEFAULT_PARAMS) {
  const thumuns = {};
  for (const id of refs.map((r) => r.id)) {
    thumuns[id] = {
      status: 'non_acquis',
      track: null,
      scores: [],
      lastReviewed: null,
      interval: 0,
      due: null,
      risk: false,
      fragileInitial: false,
    };
  }
  return {
    schemaVersion: 1,
    params: JSON.parse(JSON.stringify(params)),
    thumuns,
    journal: [],
    learnQueue: [],
    dayLog: {},
    lastBackup: null,
    khatma: 0,
  };
}

/** v1 = identité ; toute autre version lève. @param {object} raw @returns {import('../domain/types.js').AppState} */
export function migrate(raw) {
  if (!isObject(raw) || raw.schemaVersion !== 1) throw new Error(UNKNOWN_VERSION);
  return raw;
}

/** @param {import('../domain/types.js').Ref[]} refs @returns {import('../domain/types.js').AppState} */
export function loadState(refs) {
  try {
    const text = localStorage.getItem(STORAGE_KEY);
    if (text === null) return createInitialState(refs);
    return migrate(JSON.parse(text));
  } catch {
    return createInitialState(refs);
  }
}

/** @param {import('../domain/types.js').AppState} state */
export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota dépassé ou stockage indisponible : on ignore.
  }
}

/** @param {import('../domain/types.js').AppState} state @returns {string} */
export function exportState(state) {
  return JSON.stringify(state, null, 2);
}

/** @param {string} text @returns {import('../domain/types.js').AppState} */
export function importState(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(UNREADABLE);
  }
  if (!isObject(parsed) || !('schemaVersion' in parsed)) throw new Error(UNREADABLE);
  const state = migrate(parsed);
  if (!isObject(state.thumuns)) throw new Error(UNREADABLE);
  const ids = Object.keys(state.thumuns);
  if (ids.length !== THUMUN_IDS.length || !THUMUN_IDS.every((id) => id in state.thumuns)) {
    throw new Error(UNREADABLE);
  }
  return state;
}

/** Vrai si jamais sauvegardé ou si la dernière sauvegarde date de plus de `backupReminderDays` jours. */
export function backupDue(state, today) {
  if (!state.lastBackup) return true;
  return diffDays(today, state.lastBackup) > state.params.backupReminderDays;
}
