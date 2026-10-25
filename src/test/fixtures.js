import { DEFAULT_PARAMS, cycleDays } from '../domain/params.js';
import { addDays } from '../domain/dates.js';

const pad2 = (n) => String(n).padStart(2, '0');

/** 480 refs synthétiques ordonnées (60 hizbs x 8 thumuns). @returns {import('../domain/types.js').Ref[]} */
export function makeRefs() {
  const refs = [];
  for (let hizb = 1; hizb <= 60; hizb++) {
    for (let thumun = 1; thumun <= 8; thumun++) {
      refs.push({
        id: `H${pad2(hizb)}-T${thumun}`,
        hizb,
        thumun,
        juz: Math.ceil(hizb / 2),
        hizbName: 'H' + hizb,
        surah: 'S' + hizb,
        ayah: 1,
        approx: false,
      });
    }
  }
  return refs;
}

/**
 * @param {{acquis?:number[],cible?:Object<string,object>,params?:object,day?:string}} [opts]
 * @returns {import('../domain/types.js').AppState}
 */
export function makeState({ acquis = [], cible = {}, params = {}, day = '2026-10-25' } = {}) {
  const merged = { ...DEFAULT_PARAMS, ...params };
  const cycle = cycleDays(merged);
  const sorted = [...acquis].sort((a, b) => a - b);
  const n = sorted.length;
  const lastByHizb = {};
  sorted.forEach((h, i) => {
    lastByHizb[h] = addDays(day, -cycle + Math.floor((i * cycle) / n));
  });

  const thumuns = {};
  for (const ref of makeRefs()) {
    if (lastByHizb[ref.hizb] !== undefined) {
      thumuns[ref.id] = {
        status: 'acquis',
        track: 'base',
        scores: [{ date: day, score: 3, seed: true }],
        lastReviewed: lastByHizb[ref.hizb],
        interval: 0,
        due: null,
        risk: false,
        fragileInitial: false,
      };
    } else {
      thumuns[ref.id] = {
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
  }
  for (const [id, over] of Object.entries(cible)) {
    thumuns[id] = { ...thumuns[id], ...over, status: 'acquis', track: 'cible' };
  }

  return {
    schemaVersion: 1,
    params: merged,
    thumuns,
    journal: [],
    learnQueue: [],
    dayLog: {},
    lastBackup: null,
    khatma: 0,
  };
}
