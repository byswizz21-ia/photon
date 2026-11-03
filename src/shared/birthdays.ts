// Anniversaires (widget Anniversaires, rappels de src/main/reminders.ts) : data/birthdays.json.
import { daysUntil } from './days'

export interface Person {
  id: string
  name: string
  day: string // « 03-14 » (mois-jour)
  year: number | null // année de naissance, pour l'âge ; null : inconnue
}

const MAX_PEOPLE = 300
const DAY = /^(\d{2})-(\d{2})$/

export function parseBirthdays(raw: unknown): { people: Person[] } {
  const items = (raw as { people?: unknown } | null)?.people
  const people = (Array.isArray(items) ? items : [])
    .filter(
      (p): p is Person =>
        typeof p?.id === 'string' && typeof p.name === 'string' && typeof p.day === 'string'
    )
    .filter((p) => validDay(p.day))
    .slice(0, MAX_PEOPLE)
    .map(({ id, name, day, year }) => ({
      id,
      name: name.slice(0, 60),
      day,
      year: typeof year === 'number' && Number.isInteger(year) && year > 1900 ? year : null
    }))
  return { people }
}

export function validDay(day: string): boolean {
  const m = DAY.exec(day)
  if (!m) return false
  const [month, date] = [Number(m[1]), Number(m[2])]
  // 2024 : année bissextile, le 29 février est permis.
  return new Date(2024, month - 1, date).getDate() === date && month >= 1 && month <= 12
}

const pad = (n: number): string => String(n).padStart(2, '0')

// Date de l'anniversaire une année donnée ; 29 février → 28 février les autres années.
function dateIn(day: string, year: number): string {
  const [month, date] = day.split('-').map(Number) as [number, number]
  const leap = new Date(year, 1, 29).getDate() === 29
  return month === 2 && date === 29 && !leap
    ? `${year}-02-28`
    : `${year}-${pad(month)}-${pad(date)}`
}

export interface NextBirthday {
  date: string // « 2026-12-25 »
  days: number // 0 : aujourd'hui
  age: number | null // âge atteint ce jour-là
}

export function nextBirthday(person: Person, now: Date): NextBirthday {
  let year = now.getFullYear()
  let days = daysUntil(dateIn(person.day, year), now) ?? 0
  if (days < 0) {
    year++
    days = daysUntil(dateIn(person.day, year), now) ?? 0
  }
  return {
    date: dateIn(person.day, year),
    days,
    age: person.year !== null && person.year <= year ? year - person.year : null
  }
}

export const upcoming = (people: Person[], now: Date): (Person & NextBirthday)[] =>
  people.map((p) => ({ ...p, ...nextBirthday(p, now) })).sort((a, b) => a.days - b.days)

// Saisie « 14/03 » ou « 14/03/1999 » (ou avec - et .) → jour et année ; null si invalide.
export function parseDayInput(
  text: string,
  now: Date
): { day: string; year: number | null } | null {
  const m = /^\s*(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{4}))?\s*$/.exec(text)
  if (!m) return null
  const day = `${pad(Number(m[2]))}-${pad(Number(m[1]))}`
  const year = m[3] ? Number(m[3]) : null
  if (!validDay(day) || (year !== null && (year < 1900 || year > now.getFullYear()))) return null
  if (year !== null && day === '02-29' && new Date(year, 1, 29).getDate() !== 29) return null
  return { day, year }
}
