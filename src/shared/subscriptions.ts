// Abonnements (widget Abonnements, rappels de src/main/reminders.ts) : data/subscriptions.json.
// Montants en centimes.
import { dayKey } from './day'

export type Every = 'week' | 'month' | 'year'

export interface Subscription {
  id: string
  name: string
  amount: number // centimes
  every: Every
  start: string // « 2026-01-15 » : premier prélèvement, les suivants en découlent
}

const MAX_SUBS = 100
const DAY = /^\d{4}-\d{2}-\d{2}$/
export const EVERY: Record<Every, string> = { week: 'semaine', month: 'mois', year: 'an' }

export function parseSubscriptions(raw: unknown): { subs: Subscription[] } {
  const items = (raw as { subs?: unknown } | null)?.subs
  const subs = (Array.isArray(items) ? items : [])
    .filter(
      (s): s is Subscription =>
        typeof s?.id === 'string' &&
        typeof s.name === 'string' &&
        Number.isSafeInteger(s.amount) &&
        s.amount > 0 &&
        typeof s.every === 'string' &&
        s.every in EVERY &&
        typeof s.start === 'string' &&
        DAY.test(s.start)
    )
    .slice(0, MAX_SUBS)
    .map(({ id, name, amount, every, start }) => ({
      id,
      name: name.slice(0, 60),
      amount,
      every,
      start
    }))
  return { subs }
}

// n-ième échéance après `start` ; un 31 tombe le dernier jour des mois plus courts.
function nth(start: string, every: Every, n: number): string {
  const [y, m, d] = start.split('-').map(Number) as [number, number, number]
  if (every === 'week') return dayKey(new Date(y, m - 1, d), n * 7)
  const months = every === 'month' ? n : n * 12
  const last = new Date(y, m - 1 + months + 1, 0).getDate()
  return dayKey(new Date(y, m - 1 + months, Math.min(d, last)))
}

// Prochain prélèvement à partir d'aujourd'hui (compris).
export function nextCharge(sub: Subscription, today: string): string {
  if (sub.start >= today) return sub.start
  // Saut direct près de la date, puis pas à pas : pas de boucle de 10 ans de semaines.
  const [y1, m1] = sub.start.split('-').map(Number) as [number, number]
  const [y2, m2] = today.split('-').map(Number) as [number, number]
  const months = (y2 - y1) * 12 + (m2 - m1)
  let n =
    sub.every === 'week'
      ? Math.floor((Date.parse(today) - Date.parse(sub.start)) / (7 * 86_400_000))
      : sub.every === 'month'
        ? months - 1
        : Math.floor(months / 12) - 1
  n = Math.max(0, n)
  while (nth(sub.start, sub.every, n) < today) n++
  return nth(sub.start, sub.every, n)
}

// Coût ramené au mois (centimes, arrondi).
export function monthly(sub: Subscription): number {
  if (sub.every === 'week') return Math.round((sub.amount * 52) / 12)
  if (sub.every === 'year') return Math.round(sub.amount / 12)
  return sub.amount
}
