import { describe, it, expect } from 'vitest'
import { makeRefs, makeState } from './fixtures.js'
import { DEFAULT_PARAMS, cycleDays } from '../domain/params.js'
import { addDays } from '../domain/dates.js'

describe('fixtures', () => {
  it('makeRefs: 480 refs ordonnées', () => {
    const refs = makeRefs()
    expect(refs).toHaveLength(480)
    expect(refs[0]).toEqual({ id: 'H01-T1', hizb: 1, thumun: 1, juz: 1, hizbName: 'H1', surah: 'S1', ayah: 1, approx: false })
    expect(refs[479].id).toBe('H60-T8')
    expect(refs[479].juz).toBe(30)
  })
  it('makeState: état par défaut', () => {
    const s = makeState()
    expect(s.schemaVersion).toBe(1)
    expect(s.params).toEqual(DEFAULT_PARAMS)
    expect(Object.keys(s.thumuns)).toHaveLength(480)
    expect(s.thumuns['H01-T1']).toMatchObject({ status: 'non_acquis', track: null, scores: [], lastReviewed: null, interval: 0, due: null })
    expect(s.journal).toEqual([])
    expect(s.dayLog).toEqual({})
    expect(s.lastBackup).toBeNull()
  })
  it('makeState: hizbs acquis étalés', () => {
    const s = makeState({ acquis: [3, 1], day: '2026-10-25' })
    const cycle = cycleDays(DEFAULT_PARAMS)
    expect(s.thumuns['H01-T8']).toMatchObject({ status: 'acquis', track: 'base', due: null, interval: 0 })
    expect(s.thumuns['H01-T8'].scores).toEqual([{ date: '2026-10-25', score: 3, seed: true }])
    expect(s.thumuns['H01-T1'].lastReviewed).toBe(addDays('2026-10-25', -cycle))
    expect(s.thumuns['H03-T1'].lastReviewed).toBe(addDays('2026-10-25', -cycle + Math.floor(cycle / 2)))
    expect(s.thumuns['H02-T1'].status).toBe('non_acquis')
  })
  it('makeState: cible fusionné et params surchargés', () => {
    const s = makeState({ cible: { 'H14-T2': { scores: [1], interval: 2, due: '2026-10-20' } }, params: { dailyReviewHizbs: 3 } })
    expect(s.thumuns['H14-T2']).toMatchObject({ status: 'acquis', track: 'cible', scores: [1], interval: 2, due: '2026-10-20' })
    expect(s.params.dailyReviewHizbs).toBe(3)
    expect(s.params.maxInterval).toBe(30)
  })
})
