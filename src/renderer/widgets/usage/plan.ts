// Usage comparé à l'offre (designs Jauge et Tableau). Anthropic ne publie pas ses limites en
// tokens : budgets estimés, affichés avec « ≈ ».
import type { ClaudeUsage } from '../../../shared/api'

const HOUR = 3_600_000
const WINDOW = 5 * HOUR

export const PLANS = [
  ['pro', 'Pro'],
  ['max5', 'Max 5x'],
  ['max20', 'Max 20x']
] as const

const BUDGETS: Record<string, [number, number]> = {
  pro: [2.5e6, 30e6],
  max5: [5e6, 60e6],
  max20: [20e6, 240e6]
}

export const planName = (plan: string): string => PLANS.find(([id]) => id === plan)?.[1] ?? 'Max 5x'

const part = (n: number): number => Math.min(1, Math.max(0, n))

export function versus(usage: ClaudeUsage, plan: string, now: number) {
  const [session, week] = BUDGETS[plan] ?? BUDGETS['max5']!
  const start = usage.resetsAt === null ? null : usage.resetsAt - WINDOW
  const rate = start === null ? 0 : usage.session / Math.max(0.05, (now - start) / HOUR) // /h
  const over = usage.session >= session
  // Heure où la limite tombe à ce rythme ; avant la réinitialisation : avertissement.
  const hit = rate > 0 ? now + ((session - usage.session) / rate) * HOUR : Infinity
  return {
    session, // budget de la session
    week, // budget des 7 jours
    used: part(usage.session / session),
    usedWeek: part(usage.week / week),
    elapsed: start === null ? 0 : part((now - start) / WINDOW), // part de la fenêtre écoulée
    rate,
    over,
    hit,
    warn: !over && usage.resetsAt !== null && hit < usage.resetsAt
  }
}

// 1 234 567 → « 1,2 M » ; heure « 14:05 » ; durée « 2 h 05 » ou « 12 min ».
const compactFormat = new Intl.NumberFormat('fr-FR', {
  notation: 'compact',
  maximumFractionDigits: 1
})
export const compact = (n: number): string => compactFormat.format(n)
const two = (n: number): string => String(n).padStart(2, '0')
export const hm = (at: number): string => {
  const d = new Date(at)
  return `${two(d.getHours())}:${two(d.getMinutes())}`
}
export function left(at: number, now: number, pad = false): string {
  const minutes = Math.max(0, Math.ceil((at - now) / 60_000))
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)} h ${pad ? two(minutes % 60) : minutes % 60}`
}
