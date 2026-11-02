import { expect, test } from 'vitest'
import { easter, holidaysOf, upcoming } from './holidays'

const day = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

test('Pâques : dates connues', () => {
  expect(day(easter(2024))).toBe('2024-03-31')
  expect(day(easter(2025))).toBe('2025-04-20')
  expect(day(easter(2026))).toBe('2026-04-05')
  expect(day(easter(2027))).toBe('2027-03-28')
  expect(day(easter(2038))).toBe('2038-04-25') // le plus tard possible
})

test('fériés 2026 : 11 jours, fêtes mobiles justes', () => {
  const list = holidaysOf(2026, false)
  expect(list).toHaveLength(11)
  const byName = Object.fromEntries(list.map((h) => [h.name, day(h.date)]))
  expect(byName['Lundi de Pâques']).toBe('2026-04-06')
  expect(byName['Ascension']).toBe('2026-05-14')
  expect(byName['Lundi de Pentecôte']).toBe('2026-05-25')
})

test('Alsace-Moselle : deux jours de plus', () => {
  const names = holidaysOf(2026, true).map((h) => h.name)
  expect(names).toContain('Vendredi saint')
  expect(names).toContain('Saint-Étienne')
  expect(names).toHaveLength(13)
})

test('prochains : aujourd’hui compris, passage à l’année suivante, ponts', () => {
  const next = upcoming(new Date(2026, 10, 11, 18), 3, false)
  expect(next.map((h) => h.name)).toEqual(['Armistice 1918', 'Noël', "Jour de l'an"])
  expect(next.map((h) => h.days)).toEqual([0, 44, 51])
  expect(next[0]?.bridge).toBe(null) // mercredi
  expect(upcoming(new Date(2025, 10, 5), 1, false)[0]?.bridge).toBe('lundi') // 11 novembre 2025 : mardi
  expect(next[2]?.bridge).toBe(null) // vendredi 1er janvier 2027
  expect(upcoming(new Date(2027, 4, 1), 3, false)[2]?.bridge).toBe(null) // 8 mai 2027 : samedi
  const ascension = upcoming(new Date(2026, 4, 9), 1, false)[0]
  expect(ascension?.bridge).toBe('vendredi') // toujours un jeudi
  expect(upcoming(new Date(2026, 7, 1), 1, false)[0]?.weekend).toBe(true) // 15 août 2026 : samedi
})
