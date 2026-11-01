import { describe, expect, it } from 'vitest'
import { parseEvents } from './ical'

// Lundi 2 novembre 2026, 10 h UTC.
const NOW = Date.UTC(2026, 10, 2, 10)

const ics = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:standup
DTSTART:20261026T090000Z
DTEND:20261026T093000Z
RRULE:FREQ=DAILY;COUNT=30
EXDATE:20261103T090000Z
SUMMARY:Standup
END:VEVENT
BEGIN:VEVENT
UID:standup
RECURRENCE-ID:20261104T090000Z
DTSTART:20261104T150000Z
DTEND:20261104T153000Z
SUMMARY:Standup déplacé
END:VEVENT
BEGIN:VEVENT
UID:conge
DTSTART;VALUE=DATE:20261102
DTEND;VALUE=DATE:20261104
SUMMARY:Congé
END:VEVENT
BEGIN:VEVENT
UID:passe
DTSTART:20261101T080000Z
DTEND:20261101T090000Z
SUMMARY:Déjà fini
END:VEVENT
BEGIN:VEVENT
UID:annule
STATUS:CANCELLED
DTSTART:20261105T080000Z
DTEND:20261105T090000Z
SUMMARY:Annulé
END:VEVENT
END:VCALENDAR`

describe('parseEvents', () => {
  const events = parseEvents(ics, NOW, 3, 50)
  const titles = events.map((event) => event.title)

  it('déplie la récurrence, applique EXDATE et les occurrences déplacées', () => {
    // 2 nov. 9 h fini à 10 h ; 3 nov. supprimé ; 4 nov. déplacé à 15 h ; 5 nov. 9 h normal ;
    // 6 nov. après la fenêtre de 3 jours (5 nov. 10 h).
    expect(titles.filter((title) => title.startsWith('Standup'))).toEqual([
      'Standup déplacé',
      'Standup'
    ])
    const moved = events.find((event) => event.title === 'Standup déplacé')
    expect(moved?.start).toBe(Date.UTC(2026, 10, 4, 15))
  })

  it('garde les journées en cours et ignore les événements finis ou annulés', () => {
    const leave = events.find((event) => event.title === 'Congé')
    expect(leave?.allDay).toBe(true)
    expect(titles).not.toContain('Déjà fini')
    expect(titles).not.toContain('Annulé')
  })

  it('trie et limite le nombre', () => {
    expect(events.map((event) => event.start)).toEqual([...events.map((e) => e.start)].sort())
    expect(parseEvents(ics, NOW, 3, 1)).toHaveLength(1)
  })
})
