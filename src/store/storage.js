import { DEFAULT_PARAMS } from '../domain/params.js';
import { diffDays } from '../domain/dates.js';

export const STORAGE_KEY = 'qmos.state';
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
const KNOWN_IDS = new Set(THUMUN_IDS);

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

/**
 * v1 : paramètres fusionnés sur DEFAULT_PARAMS (multipliers et resetDays en profondeur) ;
 * toute autre version lève. @param {object} raw @returns {import('../domain/types.js').AppState}
 */
export function migrate(raw) {
  if (!isObject(raw) || raw.schemaVersion !== 1) throw new Error(UNKNOWN_VERSION);
  const p = isObject(raw.params) ? raw.params : {};
  const params = {
    ...JSON.parse(JSON.stringify(DEFAULT_PARAMS)),
    ...p,
    multipliers: { ...DEFAULT_PARAMS.multipliers, ...(isObject(p.multipliers) ? p.multipliers : {}) },
    resetDays: { ...DEFAULT_PARAMS.resetDays, ...(isObject(p.resetDays) ? p.resetDays : {}) },
  };
  return { ...raw, params };
}

const isDay = (v) => typeof v === 'string';
const isDayOrNull = (v) => v === null || isDay(v);

/** Forme d'un ThumunState. */
function validThumun(t) {
  return isObject(t)
    && (t.status === 'acquis' || t.status === 'non_acquis')
    && (t.track === null || t.track === 'base' || t.track === 'cible')
    && Array.isArray(t.scores)
    && t.scores.every((x) => isObject(x) && isDay(x.date) && Number.isFinite(x.score))
    && isDayOrNull(t.lastReviewed) && Number.isFinite(t.interval) && isDayOrNull(t.due)
    && typeof t.risk === 'boolean' && typeof t.fragileInitial === 'boolean'
    && (t.journalFrom === undefined || Number.isInteger(t.journalFrom));
}

const validEntry = (e) => isObject(e) && isDay(e.date) && KNOWN_IDS.has(e.thumunId)
  && Number.isFinite(e.score) && (e.pilier === 'hifdh' || e.pilier === 'revision');

/**
 * Validation commune au chargement et à l'import : version, 480 thumuns de forme valide, journal,
 * dayLog, learnQueue (ids inconnus retirés), paramètres complétés. Lève si l'état est inutilisable.
 * @param {unknown} obj
 * @returns {import('../domain/types.js').AppState}
 */
export function validateState(obj) {
  if (!isObject(obj)) throw new Error(UNREADABLE);
  const state = migrate(obj);
  const { thumuns, journal, dayLog, learnQueue } = state;
  if (!isObject(thumuns)) throw new Error(UNREADABLE);
  const ids = Object.keys(thumuns);
  if (ids.length !== THUMUN_IDS.length || !THUMUN_IDS.every((id) => validThumun(thumuns[id]))) {
    throw new Error(UNREADABLE);
  }
  if (!Array.isArray(journal) || !journal.every(validEntry)) throw new Error(UNREADABLE);
  if (!isObject(dayLog) || !Object.values(dayLog).every(isObject)) throw new Error(UNREADABLE);
  if (!Array.isArray(learnQueue)) throw new Error(UNREADABLE);
  return {
    ...state,
    learnQueue: learnQueue.filter((id) => KNOWN_IDS.has(id)),
    lastBackup: isDay(state.lastBackup) ? state.lastBackup : null,
    khatma: Number.isFinite(state.khatma) ? state.khatma : 0,
  };
}

/** @param {import('../domain/types.js').Ref[]} refs @returns {import('../domain/types.js').AppState} */
export function loadState(refs) {
  try {
    const text = localStorage.getItem(STORAGE_KEY);
    if (text === null) return createInitialState(refs);
    return validateState(JSON.parse(text));
  } catch {
    return createInitialState(refs);
  }
}

/**
 * @param {import('../domain/types.js').AppState} state
 * @returns {boolean} faux si l'enregistrement a échoué (quota dépassé, stockage indisponible)
 */
export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
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
  return validateState(parsed);
}

/** Vrai si jamais sauvegardé ou si la dernière sauvegarde date de plus de `backupReminderDays` jours. */
export function backupDue(state, today) {
  if (!state.lastBackup) return true;
  return diffDays(today, state.lastBackup) > state.params.backupReminderDays;
}
