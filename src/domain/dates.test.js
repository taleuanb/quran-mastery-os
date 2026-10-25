import { describe, it, expect } from 'vitest'
import { dayKey, addDays, diffDays, weekday } from './dates.js'

describe('dates', () => {
  it('dayKey applique le rollover', () => {
    expect(dayKey(new Date(2026, 9, 26, 1, 30), 4)).toBe('2026-10-25')
    expect(dayKey(new Date(2026, 9, 26, 4, 0), 4)).toBe('2026-10-26')
  })
  it('addDays traverse les fins de mois', () => {
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02')
    expect(addDays('2026-11-02', -3)).toBe('2026-10-30')
  })
  it('addDays est insensible au changement d\'heure', () => {
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26')
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30')
  })
  it('diffDays = a - b', () => {
    expect(diffDays('2026-11-02', '2026-10-30')).toBe(3)
    expect(diffDays('2026-10-30', '2026-11-02')).toBe(-3)
  })
  it('weekday: 0 = dimanche', () => {
    expect(weekday('2026-10-29')).toBe(4)
    expect(weekday('2026-10-25')).toBe(0)
  })
})
