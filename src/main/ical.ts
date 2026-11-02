// Lecture d'un agenda iCal (.ics) : événements à venir, récurrences et exceptions dépliées.
// ical.js (Mozilla, sans dépendance) : déplier les règles RRULE et les fuseaux à la main serait
// long et fragile, c'est la raison écrite de cette dépendance.
import ICAL from 'ical.js'
import type { CalendarEvent } from '../shared/api'

type IcalEvent = InstanceType<typeof ICAL.Event>
type IcalTime = InstanceType<typeof ICAL.Time>

const DAY_MS = 86_400_000
const MAX_STEPS = 10_000 // occurrences parcourues au plus par événement récurrent, après le saut ci-dessous

// Règles à pas fixe : on peut sauter un nombre entier de pas sans changer la grille des
// occurrences (exceptions et EXDATE tombent toujours juste). Mois et années : peu de pas, parcourus.
const STEP: Record<
  string,
  { unit: 'days' | 'hours' | 'minutes' | 'seconds'; per: number; ms: number }
> = {
  WEEKLY: { unit: 'days', per: 7, ms: 7 * DAY_MS },
  DAILY: { unit: 'days', per: 1, ms: DAY_MS },
  HOURLY: { unit: 'hours', per: 1, ms: 3_600_000 },
  MINUTELY: { unit: 'minutes', per: 1, ms: 60_000 },
  SECONDLY: { unit: 'seconds', per: 1, ms: 1_000 }
}

// Début du parcours : l'événement d'origine, avancé jusqu'à un pas avant `now` (moins sa durée,
// pour garder une occurrence en cours). Un quotidien depuis 1990 coûterait sinon 13 000 pas
// (0,4 s qui bloquent Photon). Pas de saut avec COUNT : il se compte depuis l'origine.
function iterationStart(event: IcalEvent, now: number): IcalTime {
  const start = event.startDate
  const rules = event.component.getAllProperties('rrule').map((p) => p.getFirstValue())
  const rule = rules[0] as { freq?: string; interval?: number; count?: number } | undefined
  const step = rule?.freq ? STEP[rule.freq] : undefined
  if (rules.length !== 1 || !rule || !step || rule.count) return start
  const interval = Math.max(1, rule.interval ?? 1)
  const length = Math.max(0, event.endDate.toJSDate().getTime() - start.toJSDate().getTime())
  const steps = Math.floor((now - length - start.toJSDate().getTime()) / (step.ms * interval)) - 1
  if (steps <= 0) return start
  const shifted = start.clone()
  const amount = steps * interval * step.per
  shifted.adjust(
    step.unit === 'days' ? amount : 0,
    step.unit === 'hours' ? amount : 0,
    step.unit === 'minutes' ? amount : 0,
    step.unit === 'seconds' ? amount : 0
  )
  return shifted
}

// Événements qui ne sont pas finis à `now` et commencent dans les `days` jours, triés, `max` au plus.
export function parseEvents(text: string, now: number, days: number, max: number): CalendarEvent[] {
  const root = new ICAL.Component(ICAL.parse(text))
  for (const zone of root.getAllSubcomponents('vtimezone')) {
    ICAL.TimezoneService.register(new ICAL.Timezone(zone))
  }

  // Une occurrence modifiée (RECURRENCE-ID) est rattachée à son événement récurrent.
  const all = root.getAllSubcomponents('vevent').map((component) => new ICAL.Event(component))
  const masters = all.filter((event) => !event.isRecurrenceException())
  const byUid = new Map(masters.map((event) => [event.uid, event]))
  for (const event of all) {
    if (!event.isRecurrenceException()) continue
    const master = byUid.get(event.uid)
    if (master) master.relateException(event)
    else masters.push(event) // exception sans événement d'origine : traitée comme un événement simple
  }

  const until = now + days * DAY_MS
  const found: CalendarEvent[] = []

  const add = (start: IcalTime, end: IcalTime, item: IcalEvent): void => {
    if (item.component.getFirstPropertyValue('status') === 'CANCELLED') return
    const allDay = start.isDate
    const from = start.toJSDate().getTime()
    let to = end.toJSDate().getTime()
    if (to <= from) to = from + (allDay ? DAY_MS : 0) // pas de fin indiquée
    if (to <= now || from >= until) return
    found.push({
      title: item.summary || 'Sans titre',
      start: from,
      end: to,
      allDay,
      location: item.location || ''
    })
  }

  for (const event of masters) {
    if (!event.startDate) continue
    if (!event.isRecurring()) {
      add(event.startDate, event.endDate, event)
      continue
    }
    const iterator = event.iterator(iterationStart(event, now))
    for (let step = 0; step < MAX_STEPS; step++) {
      const next = iterator.next()
      if (!next || next.toJSDate().getTime() >= until) break
      const occurrence = event.getOccurrenceDetails(next)
      add(occurrence.startDate, occurrence.endDate, occurrence.item)
    }
  }

  return found.sort((a, b) => a.start - b.start).slice(0, max)
}
