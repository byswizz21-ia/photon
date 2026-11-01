// Lecture d'un agenda iCal (.ics) : événements à venir, récurrences et exceptions dépliées.
// ical.js (Mozilla, sans dépendance) : déplier les règles RRULE et les fuseaux à la main serait
// long et fragile, c'est la raison écrite de cette dépendance.
import ICAL from 'ical.js'
import type { CalendarEvent } from '../shared/api'

type IcalEvent = InstanceType<typeof ICAL.Event>
type IcalTime = InstanceType<typeof ICAL.Time>

const DAY_MS = 86_400_000
const MAX_STEPS = 10_000 // occurrences parcourues au plus par événement récurrent (ex. quotidien depuis 1990)

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
    const iterator = event.iterator()
    for (let step = 0; step < MAX_STEPS; step++) {
      const next = iterator.next()
      if (!next || next.toJSDate().getTime() >= until) break
      const occurrence = event.getOccurrenceDetails(next)
      add(occurrence.startDate, occurrence.endDate, occurrence.item)
    }
  }

  return found.sort((a, b) => a.start - b.start).slice(0, max)
}
