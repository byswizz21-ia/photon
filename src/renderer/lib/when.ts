// Dates courtes des widgets : « aujourd'hui », « demain », sinon « sam. 8 nov. ».
import { dayKey } from '../../shared/day'

const weekday = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short'
})
const clock = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })

export function dayLabel(ms: number, now: Date): string {
  const key = dayKey(new Date(ms))
  if (key === dayKey(now)) return "aujourd'hui"
  if (key === dayKey(now, 1)) return 'demain'
  if (key === dayKey(now, -1)) return 'hier'
  return weekday.format(ms)
}

export const timeLabel = (ms: number): string => clock.format(ms)
