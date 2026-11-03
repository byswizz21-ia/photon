import { expect, test } from 'vitest'
import { byCategory, inMonth, parseBudget, perDay, sum, type Expense } from './budget'

const e = (date: string, amount: number, category: Expense['category'] = 'food'): Expense => ({
  id: date + amount,
  date,
  amount,
  category,
  label: ''
})

test('total du mois et par catégorie', () => {
  const all = [e('2026-10-31', 500), e('2026-11-01', 1200), e('2026-11-03', 800, 'fun'), e('2026-11-03', 300)]
  const month = inMonth(all, '2026-11')
  expect(sum(month)).toBe(2300)
  expect(byCategory(month)).toEqual([
    { category: 'food', amount: 1500 },
    { category: 'fun', amount: 800 }
  ])
})

test('reste par jour, aujourd’hui compris, jamais négatif', () => {
  expect(perDay(28_000, new Date(2026, 10, 3))).toBe(1000) // 28 jours restants en novembre
  expect(perDay(-500, new Date(2026, 10, 3))).toBe(0)
  expect(perDay(1000, new Date(2026, 10, 30))).toBe(1000)
})

test('fichier abîmé : on garde ce qui est lisible', () => {
  expect(parseBudget(null)).toEqual({ limit: 0, expenses: [] })
  expect(
    parseBudget({
      limit: 60000,
      expenses: [
        { id: 'a', date: '2026-11-03', amount: 450, category: 'inconnue', label: 'Pain' },
        { id: 'b', date: 'hier', amount: 100, category: 'food' },
        { id: 'c', date: '2026-11-02', amount: 0, category: 'food' }
      ]
    })
  ).toEqual({
    limit: 60000,
    expenses: [{ id: 'a', date: '2026-11-03', amount: 450, category: 'other', label: 'Pain' }]
  })
})
