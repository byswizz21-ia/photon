import { describe, expect, it } from 'vitest'
import { delay, fresh, recall, review, type Grade } from './fsrs'

const DAY = 86_400_000
const now = Date.UTC(2026, 10, 3)

describe('FSRS', () => {
  it('première note : stabilité des poids par défaut, Encore revient vite', () => {
    const again = review(fresh(now), 1, now)
    expect(again.due - now).toBe(10 * 60_000)
    expect(again.lapses).toBe(0) // une carte neuve ratée n'est pas un oubli
    const good = review(fresh(now), 3, now)
    expect(good.stability).toBeCloseTo(3.7145)
    expect((good.due - now) / DAY).toBe(4)
  })

  it('les intervalles grandissent avec Bien et rétrécissent avec un oubli', () => {
    let m = review(fresh(now), 3, now)
    const gaps: number[] = []
    for (let i = 0; i < 4; i++) {
      const t = m.due
      m = review(m, 3, t)
      gaps.push(m.due - t)
    }
    expect(gaps).toEqual([...gaps].sort((a, b) => a - b))
    const forgot = review(m, 1, m.due)
    expect(forgot.stability).toBeLessThan(m.stability)
    expect(forgot.lapses).toBe(1)
  })

  it('note plus haute = intervalle plus long', () => {
    const base = review(fresh(now), 3, now)
    const due = [1, 2, 3, 4].map((g) => review(base, g as Grade, base.due).due)
    expect(due).toEqual([...due].sort((a, b) => a - b))
  })

  it('rappel : 90 % à t = stabilité', () => {
    const m = review(fresh(now), 3, now)
    expect(recall(m, now + m.stability * DAY)).toBeCloseTo(0.9)
    expect(recall(fresh(now), now)).toBe(0)
  })

  it('délais lisibles', () => {
    expect(delay(10 * 60_000)).toBe('10 min')
    expect(delay(3 * DAY)).toBe('3 j')
    expect(delay(90 * DAY)).toBe('3 mois')
  })
})
