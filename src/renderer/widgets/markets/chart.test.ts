import { expect, test } from 'vitest'
import type { MarketQuote } from '../../../shared/api'
import { hm, money, percent, plot, seriesOf, status } from './chart'

// Mardi 3 novembre 2026, séance de Paris 9 h – 17 h 30 (heure locale du test).
const at = (day: number, h: number, m = 0): number => new Date(2026, 10, day, h, m).getTime()
const quote = (over: Partial<MarketQuote> = {}): MarketQuote => ({
  symbol: 'MC.PA',
  name: 'LVMH',
  price: 401.5,
  previous: 393.65,
  currency: 'EUR',
  time: at(3, 17, 30),
  kind: 'stock',
  exchange: 'Paris',
  session: { start: at(3, 9), end: at(3, 17, 30), offset: 0 },
  history: {},
  points: [393, 401.5],
  times: [at(3, 9), at(3, 17, 30)],
  ...over
})

test('séance : ouverte, puis prochaine ouverture en sautant le week-end', () => {
  expect(status(quote(), at(3, 12))).toMatchObject({ open: true, mid: 'Clôture 17:30' })
  expect(status(quote(), at(3, 8))).toMatchObject({ open: false, mid: "Ouvre aujourd'hui 09:00" })
  expect(status(quote(), at(3, 20))).toMatchObject({ open: false, mid: 'Ouvre demain 09:00' })
  // Vendredi soir → lundi.
  const friday = quote({ session: { start: at(6, 9), end: at(6, 17, 30), offset: 0 } })
  expect(status(friday, at(7, 11)).mid).toBe('Ouvre lun. 09:00')
  expect(status(quote({ kind: 'crypto' }), at(7, 3)).open).toBe(true)
})

test('historique prolongé du dernier cours, période absente = null', () => {
  const q = quote({ history: { '5J': { points: [380, 390], times: [at(1, 9), at(3, 9)] } } })
  expect(seriesOf(q, '5J')?.points).toEqual([380, 390, 401.5])
  expect(seriesOf(q, '1M')).toBeNull()
  expect(seriesOf(q, '1J')?.points).toEqual([393, 401.5])
})

test('tracé : la veille reste dans le cadre, 14 % de marge', () => {
  const p = plot([100, 110], 90)
  expect(p.y(90)).toBeGreaterThan(0)
  expect(p.y(90)).toBeLessThan(100)
  expect(p.line).toMatch(/^M0\.00,[\d.]+L100\.00,[\d.]+$/)
})

test('textes en français', () => {
  expect(percent(-1.234)).toBe('−1,23 %')
  expect(money(58420, 'EUR')).toBe('58 420 €')
  expect(money(12.5, '', 58420)).toBe('13')
})

test('séance : prochaine ouverture à la même heure locale après le changement d’heure', () => {
  // Vendredi 23 octobre 2026, Paris 9 h CEST (7 h UTC) ; heure d'hiver le dimanche 25.
  const start = Date.UTC(2026, 9, 23, 7)
  const end = Date.UTC(2026, 9, 23, 15, 30)
  const paris = quote({ session: { start, end, offset: 7_200_000, zone: 'Europe/Paris' } })
  const monday = Date.UTC(2026, 9, 26, 8) // 9 h CET
  expect(status(paris, Date.UTC(2026, 9, 24, 10)).mid).toContain(hm(monday))
})
