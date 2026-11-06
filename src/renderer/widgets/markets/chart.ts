// Calculs des designs détaillés (Vedette, Marché) : séries par période, tracé, état de la place,
// textes. Purs, testés dans chart.test.ts.
import type { MarketQuote, MarketRange, MarketSeries } from '../../../shared/api'

export const RANGES: MarketRange[] = ['1J', '5J', '1M', '1A']

export const RANGE_TEXT: Record<MarketRange, string> = {
  '1J': 'depuis la veille',
  '5J': 'sur 5 jours',
  '1M': 'sur 1 mois',
  '1A': 'sur 1 an'
}

const NB = ' '
const DAY = 86_400_000

// Indice : points, pas de devise.
export const currencyOf = (q: MarketQuote): string => (q.kind === 'index' ? '' : q.currency)

// ref : la valeur qui décide des décimales (un écart de 12 € sur un cours de 60 000 € : 0).
export const money = (value: number, currency: string, ref = value): string =>
  new Intl.NumberFormat('fr-FR', {
    ...(currency ? { style: 'currency', currency } : {}),
    maximumFractionDigits: Math.abs(ref) >= 1000 ? 0 : Math.abs(ref) >= 1 ? 2 : 4
  }).format(value)

export const percent = (p: number): string =>
  `${p >= 0 ? '+' : '−'}${Math.abs(p).toFixed(2).replace('.', ',')}${NB}%`

export const signed = (v: number, currency: string, ref: number): string =>
  `${v >= 0 ? '+' : '−'}${money(Math.abs(v), currency, ref)}`

// 1J : la journée. Sinon l'historique (relu toutes les heures), prolongé du dernier cours.
export function seriesOf(q: MarketQuote, range: MarketRange): MarketSeries | null {
  const line = range === '1J' ? q : q.history[range]
  if (!line || line.points.length < 2) return null
  if (range === '1J' || q.time <= (line.times.at(-1) ?? 0)) return line
  return { points: [...line.points, q.price], times: [...line.times, q.time] }
}

// Base de la variation : la veille pour 1J, le début de la période sinon.
export const baseOf = (q: MarketQuote, range: MarketRange, line: MarketSeries): number =>
  range === '1J' ? q.previous : (line.points[0] ?? q.previous)

// Tracé dans un carré 100 × 100 (étiré à la carte), 14 % de marge en haut et en bas.
// La veille (pointillés) reste dans le cadre.
export function plot(points: number[], previous: number | null) {
  let lo = Math.min(...points)
  let hi = Math.max(...points)
  if (previous !== null) {
    lo = Math.min(lo, previous)
    hi = Math.max(hi, previous)
  }
  const pad = (hi - lo) * 0.14 || 1
  const low = lo - pad
  const high = hi + pad
  const x = (i: number): number => (i * 100) / Math.max(1, points.length - 1)
  const y = (p: number): number => (1 - (p - low) / (high - low)) * 100
  const line = points
    .map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(2)},${y(p).toFixed(2)}`)
    .join('')
  return { x, y, line, area: `${line}L100,100L0,100Z`, low, high }
}

const pad2 = (n: number): string => String(n).padStart(2, '0')
export const hm = (t: number): string => {
  const d = new Date(t)
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

const weekday = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' })
const dayMonth = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })
const dayYear = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric'
})
const month = new Intl.DateTimeFormat('fr-FR', { month: 'short' })
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)

// Heure d'un point : au survol (axis = false) ou sous la courbe (axis = true, plus court).
export function timeText(t: number, range: MarketRange, axis = false): string {
  const d = new Date(t)
  if (range === '1J') return hm(t)
  if (range === '5J') return axis ? cap(weekday.format(d)) : `${cap(weekday.format(d))} ${hm(t)}`
  if (range === '1M') return dayMonth.format(d)
  return axis ? month.format(d) : dayYear.format(d)
}

export interface Status {
  open: boolean
  short: string // « En séance », « Clôturé »
  mid: string // « Clôture 17:30 », « Ouvre demain 09:00 »
  long: string // avec le nom de la place (info-bulle)
}

const midnight = (t: number): number => new Date(t).setHours(0, 0, 0, 0)

const zoneFormats = new Map<string, Intl.DateTimeFormat>()

// Décalage (ms) du fuseau `zone` à l'instant t ; fuseau inconnu : 0.
function zoneOffset(zone: string, t: number): number {
  try {
    let format = zoneFormats.get(zone)
    if (!format) {
      const n = 'numeric'
      format = new Intl.DateTimeFormat('en-US', {
        timeZone: zone,
        hourCycle: 'h23',
        ...{ year: n, month: n, day: n, hour: n, minute: n, second: n }
      })
      zoneFormats.set(zone, format)
    }
    const part = (type: string): number =>
      Number(format?.formatToParts(t).find((p) => p.type === type)?.value)
    const wall = Date.UTC(
      part('year'),
      part('month') - 1,
      part('day'),
      part('hour'),
      part('minute')
    )
    return wall - Math.floor(t / 60_000) * 60_000
  } catch {
    return 0
  }
}

// Place ouverte ou fermée, d'après la séance donnée par Yahoo (heures locales de Hugo).
// ponytail: jours fériés ignorés (« ouvre demain » un 25 décembre), Yahoo n'en donne pas la liste.
export function status(q: MarketQuote, now: number): Status {
  if (q.kind === 'crypto')
    return { open: true, short: '24 h/24', mid: '24 h/24', long: 'Crypto · 24 h/24' }
  const s = q.session
  if (!s) return { open: false, short: 'Clôturé', mid: 'Clôturé', long: q.exchange }
  if (now >= s.start && now < s.end) {
    const mid = `Clôture ${hm(s.end)}`
    return { open: true, short: 'En séance', mid, long: `${q.exchange} · ${mid.toLowerCase()}` }
  }
  // Prochaine ouverture : même heure locale de la place, jour ouvré suivant (changement d'heure
  // compris quand Yahoo donne le fuseau).
  const weekend = (t: number): boolean => [0, 6].includes(new Date(t + s.offset).getUTCDay())
  const sameHour = (t: number): number =>
    s.zone ? t + zoneOffset(s.zone, s.start) - zoneOffset(s.zone, t) : t
  let next = s.start
  for (let day = 1; next <= now || weekend(next); day++) next = sameHour(s.start + day * DAY)
  const days = Math.round((midnight(next) - midnight(now)) / DAY)
  const when = days === 0 ? "aujourd'hui" : days === 1 ? 'demain' : weekday.format(next)
  const mid = `Ouvre ${when} ${hm(next)}`
  return { open: false, short: 'Clôturé', mid, long: `${q.exchange} · ${mid.toLowerCase()}` }
}
