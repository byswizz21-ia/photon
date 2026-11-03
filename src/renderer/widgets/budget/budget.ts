// Budget du mois (data/budget.json, partagé entre profils sauf réglage own) : dépenses en centimes.
export const CATEGORIES = {
  food: 'Courses',
  eat: 'Resto',
  transport: 'Transport',
  fun: 'Loisirs',
  home: 'Logement',
  health: 'Santé',
  shopping: 'Shopping',
  other: 'Autre'
} as const
export type Category = keyof typeof CATEGORIES

export interface Expense {
  id: string
  date: string // « 2026-11-03 »
  amount: number // centimes
  category: Category
  label: string
}

export interface Budget {
  limit: number // centimes par mois ; 0 : pas de plafond
  expenses: Expense[]
}

const MAX_EXPENSES = 3000 // les plus anciennes partent
const DAY = /^\d{4}-\d{2}-\d{2}$/

export function parseBudget(raw: unknown): Budget {
  const r = (raw ?? {}) as { limit?: unknown; expenses?: unknown }
  const expenses = (Array.isArray(r.expenses) ? r.expenses : [])
    .filter(
      (e): e is Expense =>
        typeof e?.id === 'string' &&
        typeof e.date === 'string' &&
        DAY.test(e.date) &&
        Number.isSafeInteger(e.amount) &&
        e.amount > 0
    )
    .map(({ id, date, amount, category, label }) => ({
      id,
      date,
      amount,
      category: typeof category === 'string' && category in CATEGORIES ? category : 'other',
      label: typeof label === 'string' ? label.slice(0, 60) : ''
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-MAX_EXPENSES)
  const limit = Number.isSafeInteger(r.limit) && (r.limit as number) > 0 ? (r.limit as number) : 0
  return { limit, expenses }
}

export const inMonth = (expenses: Expense[], month: string): Expense[] =>
  expenses.filter((e) => e.date.startsWith(month))

export const sum = (expenses: Expense[]): number => expenses.reduce((t, e) => t + e.amount, 0)

// Dépenses par catégorie, la plus grosse d'abord.
export function byCategory(expenses: Expense[]): { category: Category; amount: number }[] {
  const totals = new Map<Category, number>()
  for (const e of expenses) totals.set(e.category, (totals.get(e.category) ?? 0) + e.amount)
  return [...totals]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
}

// Ce qu'on peut encore dépenser par jour jusqu'à la fin du mois, aujourd'hui compris.
export function perDay(left: number, now: Date): number {
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  return Math.max(0, Math.floor(left / (last - now.getDate() + 1)))
}
