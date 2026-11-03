import { expect, test } from 'vitest'
import { draw, names, randomInt } from './random'

test('entier dans les bornes, valeurs biaisées rejetées', () => {
  for (let i = 0; i < 200; i++) {
    const n = randomInt(6)
    expect(n).toBeGreaterThanOrEqual(0)
    expect(n).toBeLessThan(6)
  }
  // Première valeur dans la zone biaisée (≥ limite), la suivante acceptée.
  const values = [2 ** 32 - 1, 7]
  expect(randomInt(6, () => values.shift() ?? 0)).toBe(1)
  expect(randomInt(0)).toBe(0)
})

test('liste : lignes vides et doublons retirés', () => {
  expect(names(' Léa \n\nTom\nLéa\n')).toEqual(['Léa', 'Tom'])
})

test('sans remise : chaque nom une fois, puis on recommence', () => {
  const all = ['a', 'b', 'c']
  let drawn: string[] = []
  const seen = new Set<string>()
  for (let i = 0; i < 3; i++) {
    const result = draw(all, drawn)!
    seen.add(result.name)
    drawn = result.drawn
  }
  expect(seen.size).toBe(3)
  expect(draw(all, drawn)!.drawn).toHaveLength(1)
  expect(draw([], [])).toBeNull()
})
