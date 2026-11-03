import { expect, test } from 'vitest'
import { monthly, nextCharge, parseSubscriptions, type Subscription } from './subscriptions'

const sub = (every: Subscription['every'], start: string, amount = 1299): Subscription => ({
  id: 'a',
  name: 'Netflix',
  amount,
  every,
  start
})

test('prochain prélèvement mensuel, y compris un 31', () => {
  expect(nextCharge(sub('month', '2026-01-15'), '2026-11-03')).toBe('2026-11-15')
  expect(nextCharge(sub('month', '2026-01-15'), '2026-11-15')).toBe('2026-11-15')
  expect(nextCharge(sub('month', '2026-01-15'), '2026-11-16')).toBe('2026-12-15')
  expect(nextCharge(sub('month', '2026-01-31'), '2026-11-03')).toBe('2026-11-30')
  expect(nextCharge(sub('month', '2026-01-31'), '2026-12-01')).toBe('2026-12-31')
})

test('hebdomadaire, annuel, et premier prélèvement à venir', () => {
  expect(nextCharge(sub('week', '2026-10-01'), '2026-11-03')).toBe('2026-11-05')
  expect(nextCharge(sub('year', '2024-02-29'), '2026-11-03')).toBe('2027-02-28')
  expect(nextCharge(sub('year', '2025-03-10'), '2026-11-03')).toBe('2027-03-10')
  expect(nextCharge(sub('month', '2027-01-01'), '2026-11-03')).toBe('2027-01-01')
})

test('coût ramené au mois', () => {
  expect(monthly(sub('month', '2026-01-01', 1299))).toBe(1299)
  expect(monthly(sub('year', '2026-01-01', 12000))).toBe(1000)
  expect(monthly(sub('week', '2026-01-01', 300))).toBe(1300)
})

test('fichier abîmé : on garde ce qui est lisible', () => {
  expect(parseSubscriptions(null)).toEqual({ subs: [] })
  const ok = sub('month', '2026-01-15')
  expect(
    parseSubscriptions({ subs: [ok, { ...ok, id: 'b', amount: -3 }, { ...ok, id: 'c', every: 'jour' }] })
  ).toEqual({ subs: [ok] })
})
