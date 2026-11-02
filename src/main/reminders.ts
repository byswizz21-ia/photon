// Rappels datés des widgets du profil courant, vérifiés chaque minute (Photon caché compris) :
// événement d'agenda imminent, compte à rebours la veille et le jour J, déclaration URSSAF,
// chrono oublié. Rien de lu sur le disque ni sur le réseau ici : caches déjà en mémoire.
import type { CalendarFeed } from '../shared/api'
import { dayKey } from '../shared/day'
import { daysUntil } from '../shared/days'
import { nextDeclaration } from '../shared/micro'
import type { NotifySource, WidgetInstance } from '../shared/model'
import { duration, parseTime, type TimeData } from '../shared/timetrack'
import { calendar } from './calendar'
import { data } from './data'
import { notify } from './notify'
import { sharedLoad } from './shared'

const MINUTE = 60_000
const MORNING_H = 9 // rappels « du jour » : pas avant 9 h
const FORGOTTEN_MS = 4 * 60 * MINUTE
export const CALENDAR_REMIND = 10 // min avant un événement, réglage remind du widget Agenda

export interface Reminder {
  key: string // une seule notification par clé
  source: NotifySource
  title: string
  body: string
}

export interface ReminderInput {
  widgets: WidgetInstance[]
  feed: (url: unknown) => CalendarFeed | null
  time: TimeData
}

const longDate = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long'
})
const clock = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })

function calendarReminders(widget: WidgetInstance, input: ReminderInput, now: Date): Reminder[] {
  const remind = widget.settings['remind'] ?? CALENDAR_REMIND
  if (typeof remind !== 'number' || remind <= 0) return []
  const events = input.feed(widget.settings['url'])?.events ?? []
  return events
    .filter(
      (e) => !e.allDay && e.start > now.getTime() && e.start - now.getTime() <= remind * MINUTE
    )
    .map((e) => {
      const minutes = Math.max(1, Math.round((e.start - now.getTime()) / MINUTE))
      return {
        key: `calendar:${e.start}:${e.title}`,
        source: 'calendar',
        title: e.title,
        body: `Dans ${minutes} min, à ${clock.format(e.start)}${e.location ? ` · ${e.location}` : ''}`
      }
    })
}

function countdownReminders(widget: WidgetInstance, now: Date): Reminder[] {
  const date = widget.settings['date']
  const days = typeof date === 'string' ? daysUntil(date, now) : null
  if (days !== 0 && days !== 1) return []
  const title = widget.settings['title']
  const name = typeof title === 'string' && title ? title : 'Compte à rebours'
  return [
    {
      key: `countdown:${widget.id}:${date}:${days}`,
      source: 'countdown',
      title: `${days === 0 ? "Aujourd'hui" : 'Demain'} : ${name}`,
      body: longDate.format(new Date(`${date}T00:00`))
    }
  ]
}

function microReminders(widget: WidgetInstance, now: Date): Reminder[] {
  const period = widget.settings['period'] === 'trimestre' ? 'trimestre' : 'mois'
  const declaration = nextDeclaration(dayKey(now), period)
  const days = daysUntil(declaration.deadline, now)
  if (days === null || days > 7) return []
  const last = days === 0
  return [
    {
      key: `micro:${declaration.deadline}:${last ? 'last' : 'week'}`,
      source: 'micro',
      title: last
        ? 'Déclaration URSSAF : dernier jour'
        : `Déclaration URSSAF dans ${days} jour${days > 1 ? 's' : ''}`,
      body: `Chiffre d'affaires de ${declaration.name}, à déclarer avant le ${longDate.format(new Date(`${declaration.deadline}T00:00`))}.`
    }
  ]
}

function timetrackReminders(time: TimeData, now: Date): Reminder[] {
  const running = time.running
  if (!running || now.getTime() - running.start < FORGOTTEN_MS) return []
  const project = time.projects.find((p) => p.id === running.project)?.name ?? 'Un projet'
  return [
    {
      key: `timetrack:${running.start}`,
      source: 'timetrack',
      title: 'Chrono toujours en cours',
      body: `« ${project} » tourne depuis ${duration(now.getTime() - running.start)}. Oublié ?`
    }
  ]
}

// Rappels dus à l'instant `now` (pur, testé) ; le dédoublonnage se fait par clé.
export function dueReminders(input: ReminderInput, now: Date): Reminder[] {
  const morning = now.getHours() >= MORNING_H
  const micro = input.widgets.find((w) => w.type === 'micro') // une seule déclaration, données partagées
  return [
    ...input.widgets.flatMap((widget) => {
      if (widget.type === 'calendar') return calendarReminders(widget, input, now)
      if (widget.type === 'countdown' && morning) return countdownReminders(widget, now)
      return []
    }),
    ...(micro && morning ? microReminders(micro, now) : []),
    ...timetrackReminders(input.time, now)
  ]
}

// ponytail: clés en mémoire seulement ; Photon relancé le même jour peut redonner un rappel
// « du jour » une fois. Les écrire sur disque si ça gêne.
const sent = new Set<string>()

async function tick(): Promise<void> {
  const time = parseTime(await sharedLoad('timetrack'))
  const due = dueReminders({ widgets: data.profile.widgets, feed: calendar, time }, new Date())
  for (const reminder of due) {
    if (sent.has(reminder.key)) continue
    sent.add(reminder.key)
    notify(reminder.source, { title: reminder.title, body: reminder.body })
  }
}

export function startReminders(): void {
  void tick()
  setInterval(() => void tick(), MINUTE)
}
