import { expect, test } from 'vitest'
import type { WeatherHour } from '../../../shared/api'
import { curve, rainFrom, sunArc, upcoming, uvLabel, windName } from './forecast'

const at = (h: number): number => new Date(2026, 10, 3, h).getTime()
const hour = (h: number, rain: number | null): WeatherHour => ({
  time: at(h),
  temperature: 10,
  code: 2,
  day: true,
  rain
})

test('heures à venir à partir de l’heure en cours, pluie avant minuit', () => {
  const hours = [hour(13, 0), hour(14, 10), hour(15, 60), hour(23, 80), hour(25, 90)]
  expect(upcoming(hours, at(14) + 20 * 60_000, 2).map((h) => h.time)).toEqual([at(14), at(15)])
  expect(rainFrom(hours, at(14))).toBe(at(15))
  expect(rainFrom(hours, at(16))).toBe(at(23))
  expect(rainFrom([hour(25, 90)], at(16))).toBeNull() // demain
})

test('vent et UV en français', () => {
  expect(windName(225)).toBe('Sud-ouest')
  expect(windName(225, true)).toBe('SO')
  expect(windName(359)).toBe('Nord')
  expect(windName(-90, true)).toBe('O')
  expect(uvLabel(2)).toBe('faible')
  expect(uvLabel(6.5)).toBe('élevé')
})

test('courbe : un point par colonne ; soleil : midi en haut de l’arc, nuit au bord', () => {
  const c = curve([5, 10, 5], 300, 44)
  expect(c.points.map(([x]) => x)).toEqual([50, 150, 250])
  expect(c.points[1]![1]).toBeLessThan(c.points[0]![1]) // plus chaud = plus haut
  const noon = sunArc(240, 48, at(7), at(17), at(12))
  expect(noon.x).toBeCloseTo(120)
  expect(noon.y).toBeCloseTo(8)
  expect(noon.day).toBe(true)
  expect(noon.toSet).toBe(300)
  expect(sunArc(240, 48, at(7), at(17), at(20)).day).toBe(false)
})
