import { expect, test } from 'vitest'
import type { ClaudeUsage } from '../../../shared/api'
import { versus } from './plan'

const H = 3_600_000
const now = new Date(2026, 10, 3, 12).getTime()
const usage = (session: number, resetsAt: number | null): ClaudeUsage => ({
  session,
  messages: 10,
  resetsAt,
  today: session,
  week: 30e6,
  days: [0, 0, 0, 0, 0, 0, session],
  sources: 1
})

test('session à moitié, à mi-fenêtre : pas d’avertissement', () => {
  const v = versus(usage(2.5e6, now + 2.5 * H), 'max5', now)
  expect(v.used).toBe(0.5)
  expect(v.elapsed).toBe(0.5)
  expect(v.usedWeek).toBe(0.5)
  expect(v.rate).toBe(1e6)
  expect(v.warn).toBe(false)
})

test('rythme trop rapide : limite avant la réinitialisation ; limite dépassée', () => {
  const fast = versus(usage(4e6, now + 4 * H), 'max5', now) // 4 M en 1 h
  expect(fast.warn).toBe(true)
  expect(fast.hit).toBe(now + 0.25 * H)
  const over = versus(usage(3e6, now + H), 'pro', now)
  expect(over.over).toBe(true)
  expect(over.used).toBe(1)
  expect(over.warn).toBe(false)
})

test('aucune session : rien d’écoulé, offre inconnue = Max 5x', () => {
  const v = versus(usage(0, null), 'inconnue', now)
  expect(v).toMatchObject({ session: 5e6, elapsed: 0, rate: 0, warn: false, over: false })
})
