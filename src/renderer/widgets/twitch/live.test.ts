import { describe, expect, it } from 'vitest'
import { duration, viewers } from './live'

describe('live', () => {
  it('compte les spectateurs en court', () => {
    expect(viewers(842)).toBe('842')
    expect(viewers(1500).replace(/\s/g, ' ')).toBe('1,5 k')
  })

  it('donne la durée du live', () => {
    const now = Date.UTC(2026, 10, 3, 20)
    expect(duration(null, now)).toBe('')
    expect(duration(now - 45 * 60_000, now)).toBe('45 min')
    expect(duration(now - 125 * 60_000, now)).toBe('2 h 05')
  })
})
