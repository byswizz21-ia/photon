// Habitudes : jours cochés et séries (data/habits.json, partagé entre profils sauf réglage own).
import { dayKey } from '../../../shared/day'

export interface Habit {
  id: string
  name: string
  days: string[] // jours faits, « 2026-11-02 », triés
}

const MAX_HABITS = 20
const MAX_DAYS = 800 // un peu plus de deux ans

const DAY = /^\d{4}-\d{2}-\d{2}$/

export function parseHabits(raw: unknown): { habits: Habit[] } {
  const items = (raw as { habits?: unknown } | null)?.habits
  const habits = (Array.isArray(items) ? items : [])
    .filter(
      (h): h is Habit =>
        typeof h?.id === 'string' && typeof h.name === 'string' && Array.isArray(h.days)
    )
    .slice(0, MAX_HABITS)
    .map(({ id, name, days }) => ({
      id,
      name: name.slice(0, 60),
      days: [...new Set(days.filter((d) => typeof d === 'string' && DAY.test(d)))]
        .sort()
        .slice(-MAX_DAYS)
    }))
  return { habits }
}

// Jours d'affilée jusqu'à aujourd'hui. Aujourd'hui pas encore coché : la série d'hier tient.
export function streak(days: string[], now: Date): number {
  const done = new Set(days)
  let offset = done.has(dayKey(now)) ? 0 : -1
  let count = 0
  while (done.has(dayKey(now, offset))) {
    count++
    offset--
  }
  return count
}

export function toggleDay(habit: Habit, day: string): void {
  habit.days = habit.days.includes(day)
    ? habit.days.filter((d) => d !== day)
    : [...habit.days, day].sort().slice(-MAX_DAYS)
}

export const canAdd = (habits: Habit[]): boolean => habits.length < MAX_HABITS

// Plus longue série de jours d'affilée de l'historique.
export function best(days: string[]): number {
  let record = 0
  let run = 0
  let previous = ''
  for (const day of days) {
    const [y, m, d] = day.split('-').map(Number) as [number, number, number]
    run = previous && dayKey(new Date(y, m - 1, d), -1) === previous ? run + 1 : 1
    record = Math.max(record, run)
    previous = day
  }
  return record
}

// Jours faits parmi les `span` derniers (aujourd'hui compris).
export function doneIn(days: string[], now: Date, span: number): number {
  const done = new Set(days)
  let count = 0
  for (let offset = 0; offset > -span; offset--) if (done.has(dayKey(now, offset))) count++
  return count
}
