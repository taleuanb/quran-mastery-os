import { describe, it, expect } from 'vitest'
import { loadRefs, refById, refsOfHizb, hizbInfo } from './referential.js'

describe('referential', () => {
  it('480 thumuns uniques dans l\'ordre du Coran', () => {
    const refs = loadRefs()
    expect(refs.length).toBe(480)
    expect(new Set(refs.map((r) => r.id)).size).toBe(480)
    expect(refs[0].id).toBe('H01-T1')
    expect(refs[479].id).toBe('H60-T8')
  })

  it('refsOfHizb renvoie les 8 thumuns du hizb', () => {
    const refs = refsOfHizb(26)
    expect(refs.length).toBe(8)
    expect(refs.map((r) => r.thumun)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(refs.every((r) => r.hizb === 26)).toBe(true)
  })

  it('débuts de quart connus (fiables)', () => {
    expect(refById('H01-T1')).toMatchObject({ surah: 'الفاتحة', ayah: 1, approx: false })
    expect(refById('H01-T3')).toMatchObject({ surah: 'البقرة', ayah: 26, approx: false })
    expect(refById('H01-T7')).toMatchObject({ surah: 'البقرة', ayah: 60, approx: false })
    expect(refById('H02-T1')).toMatchObject({ surah: 'البقرة', ayah: 75, approx: false })
    expect(refById('H25-T1')).toMatchObject({ surah: 'يوسف', ayah: 53, hizbName: 'وما أبرئ', approx: false })
    expect(refById('H26-T1')).toMatchObject({ surah: 'الرعد', ayah: 19, approx: false })
    expect(refById('H60-T1')).toMatchObject({ surah: 'الأعلى', ayah: 1, approx: false })
  })

  it('juz et nom de hizb', () => {
    expect(refById('H25-T4').juz).toBe(13)
    expect(refById('H60-T8').juz).toBe(30)
    expect(hizbInfo(25)).toEqual({ hizb: 25, juz: 13, hizbName: 'وما أبرئ', surah: 'يوسف' })
    expect(hizbInfo(60)).toMatchObject({ hizb: 60, juz: 30, surah: 'الأعلى' })
  })

  it('le nom du hizb est le même pour les 8 thumuns de chaque hizb', () => {
    for (let h = 1; h <= 60; h++) {
      const names = new Set(refsOfHizb(h).map((r) => r.hizbName))
      expect(names.size).toBe(1)
      expect([...names][0]).toMatch(/^[؀-ۿ\s()-]+$/)
    }
  })

  it('thumuns pairs approximatifs, impairs fiables', () => {
    for (const r of loadRefs()) {
      expect(r.approx).toBe(r.thumun % 2 === 0)
    }
  })

  it('chaque verset pair est strictement entre les deux débuts de quart voisins', () => {
    const refs = loadRefs()
    const order = new Map()
    for (const r of refs) if (!order.has(r.surah)) order.set(r.surah, order.size)
    const pos = (r) => order.get(r.surah) * 1000 + r.ayah
    refs.forEach((r, i) => {
      if (r.thumun % 2 !== 0) return
      const start = refs[i - 1]
      const next = refs[i + 1]
      expect(pos(r), r.id).toBeGreaterThan(pos(start))
      if (next) expect(pos(r), r.id).toBeLessThan(pos(next))
    })
  })

  it('refById lève sur un id inconnu', () => {
    expect(() => refById('H61-T1')).toThrow()
  })
})
