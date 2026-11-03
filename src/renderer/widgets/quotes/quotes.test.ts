import { expect, test } from 'vitest'
import { parseCustom, pick, pool, THEMES } from './quotes'

test('citations perso : « texte — auteur », auteur facultatif', () => {
  expect(parseCustom('Fais simple — Moi\n\n  Sans auteur  \nPeut-être - pas - Lui')).toEqual([
    { text: 'Fais simple', author: 'Moi' },
    { text: 'Sans auteur', author: '' },
    { text: 'Peut-être - pas', author: 'Lui' }
  ])
})

test('réserve : thèmes cochés (inconnus ignorés) puis citations perso', () => {
  const quotes = pool(['sport', 'inconnu'], 'Hop — Hugo')
  expect(quotes).toHaveLength(THEMES.sport.quotes.length + 1)
  expect(quotes.at(-1)).toEqual({ text: 'Hop', author: 'Hugo' })
})

test('citation du jour : stable dans la journée, tour complet avant de se répéter', () => {
  const quotes = pool(['code'], '')
  const day = new Date(2026, 10, 3, 9)
  expect(pick(quotes, day, 0)).toBe(pick(quotes, new Date(2026, 10, 3, 23), 0))
  const seen = new Set(quotes.map((_, i) => pick(quotes, day, i)))
  expect(seen.size).toBe(quotes.length)
  expect(pick([], day, 0)).toBeNull()
})

test('aucune citation vide', () => {
  for (const theme of Object.values(THEMES)) {
    for (const [text, author] of theme.quotes) expect(text && author).toBeTruthy()
  }
})
