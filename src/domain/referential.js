import thumuns from '../data/thumuns.json'

/** @typedef {import('./types.js').Ref} Ref */

const refs = /** @type {Ref[]} */ (thumuns)
const byId = new Map(refs.map((r) => [r.id, r]))

/** Les 480 thumuns dans l'ordre du Coran. @returns {Ref[]} */
export function loadRefs() {
  return refs
}

/** @param {string} id @returns {Ref} */
export function refById(id) {
  const ref = byId.get(id)
  if (!ref) throw new Error(`Thumun inconnu : ${id}`)
  return ref
}

/** Les 8 thumuns d'un hizb (1 à 60). @param {number} hizb @returns {Ref[]} */
export function refsOfHizb(hizb) {
  return refs.slice((hizb - 1) * 8, hizb * 8)
}

/** @param {number} hizb @returns {{hizb:number,juz:number,hizbName:string,surah:string}} */
export function hizbInfo(hizb) {
  const first = refsOfHizb(hizb)[0]
  if (!first) throw new Error(`Hizb inconnu : ${hizb}`)
  return { hizb, juz: first.juz, hizbName: first.hizbName, surah: first.surah }
}
