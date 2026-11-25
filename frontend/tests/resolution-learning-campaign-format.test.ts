import { describe, expect, it } from 'vitest'
import { toLocalDateInput, toLocalDateTimeIso } from '@/features/resolution-learning/services/campaign-format'

describe('resolution learning campaign date contract', () => {
  it('adds the browser local offset to a calendar date without shifting its day', () => {
    const date = '2026-11-13'
    const value = toLocalDateTimeIso(date)
    expect(value).toMatch(/^2026-11-13T00:00:00[+-]\d{2}:\d{2}$/)
    expect(new Date(value).getFullYear()).toBe(2026)
    expect(new Date(value).getMonth()).toBe(10)
    expect(new Date(value).getDate()).toBe(13)
  })

  it('loads the same calendar day from a zoned Backend timestamp into the date picker', () => {
    const zoned = toLocalDateTimeIso('2026-11-13')
    expect(toLocalDateInput(new Date(zoned).toISOString())).toBe('2026-11-13')
  })

  it('rejects malformed or impossible calendar dates', () => {
    expect(() => toLocalDateTimeIso('13/11/2026')).toThrow('yyyy-MM-dd')
    expect(() => toLocalDateTimeIso('2026-02-30')).toThrow('Ngày không hợp lệ')
  })
})
