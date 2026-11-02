import { expect, test } from 'vitest'
import { daysUntil } from './days'

test('jours restants : futur, aujourd’hui, passé', () => {
  const now = new Date(2026, 10, 2, 23, 59) // 2 novembre 2026, 23 h 59
  expect(daysUntil('2026-11-02', now)).toBe(0)
  expect(daysUntil('2026-11-03', now)).toBe(1)
  expect(daysUntil('2026-12-25', now)).toBe(53)
  expect(daysUntil('2026-10-31', now)).toBe(-2)
})

test('changement d’heure : toujours des jours entiers', () => {
  expect(daysUntil('2027-04-01', new Date(2027, 2, 1, 12))).toBe(31) // passage à l'heure d'été
})

test('date absente ou invalide', () => {
  const now = new Date(2026, 10, 2)
  expect(daysUntil('', now)).toBeNull()
  expect(daysUntil('2026-02-31', now)).toBeNull()
  expect(daysUntil('demain', now)).toBeNull()
})
