import { expect, test } from 'vitest'
import { liveStreak, nextStreak, parseSaved, themeLabels } from './saved'

test('données relues : valeurs fausses remplacées, coups invalides retirés', () => {
  expect(parseSaved(null)).toEqual({
    streak: 0,
    solvedDay: '',
    solvedId: '',
    trained: 0,
    bot: { moves: [], color: 'w' },
    duo: { moves: [] }
  })
  const saved = parseSaved({
    streak: -2,
    trained: 3.7,
    bot: { moves: ['e2e4', 'x', 7, 'e7e8q'], color: 'b' }
  })
  expect(saved.streak).toBe(0)
  expect(saved.trained).toBe(3)
  expect(saved.bot).toEqual({ moves: ['e2e4', 'e7e8q'], color: 'b' })
})

test('série du problème du jour', () => {
  const saved = { ...parseSaved(null), streak: 4, solvedDay: '2026-11-02' }
  expect(nextStreak(saved, '2026-11-03', '2026-11-02')).toBe(5)
  expect(nextStreak(saved, '2026-11-02', '2026-11-01')).toBe(4) // déjà réussi aujourd'hui
  expect(nextStreak(saved, '2026-11-05', '2026-11-04')).toBe(1) // série cassée
  expect(liveStreak(saved, '2026-11-03', '2026-11-02')).toBe(4)
  expect(liveStreak(saved, '2026-11-04', '2026-11-03')).toBe(0)
})

test('thèmes : seulement les parlants, deux au plus', () => {
  expect(themeLabels(['short', 'fork', 'middlegame', 'pin', 'mateIn2'])).toEqual([
    'Fourchette',
    'Clouage'
  ])
})
