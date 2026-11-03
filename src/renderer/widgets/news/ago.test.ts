import { expect, test } from 'vitest'
import { ago } from './ago'

test('âge d’un article', () => {
  const now = Date.UTC(2026, 10, 3, 12)
  expect(ago(0, now)).toBe('')
  expect(ago(now - 30_000, now)).toBe('à l’instant')
  expect(ago(now - 12 * 60_000, now)).toBe('12 min')
  expect(ago(now - 3 * 3_600_000, now)).toBe('3 h')
  expect(ago(now - 30 * 3_600_000, now)).toBe('hier')
  expect(ago(now - 4 * 86_400_000, now)).toBe('4 j')
  expect(ago(now - 20 * 86_400_000, now)).toMatch(/oct/)
})
