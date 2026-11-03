import { expect, test, vi } from 'vitest'
import type { CalendarFeed } from '../shared/api'
import type { WidgetInstance } from '../shared/model'

vi.mock('./calendar', () => ({ calendar: () => null }))
vi.mock('./data', () => ({ data: {} }))
vi.mock('./notify', () => ({ notify: () => {} }))
vi.mock('./shared', () => ({ sharedLoad: async () => null }))

const { dueReminders } = await import('./reminders')

const MINUTE = 60_000
const now = new Date(2026, 10, 30, 9, 30) // lundi 30 novembre, 9 h 30 : échéance URSSAF d'octobre
const widget = (type: string, settings: Record<string, unknown> = {}): WidgetInstance => ({
  id: `${type}-${JSON.stringify(settings)}`,
  type,
  x: 0,
  y: 0,
  w: 1,
  h: 1,
  settings
})
const feed: CalendarFeed = {
  events: [
    {
      title: 'Réunion',
      start: now.getTime() + 8 * MINUTE,
      end: 0,
      allDay: false,
      location: 'Zoom'
    },
    { title: 'Plus tard', start: now.getTime() + 20 * MINUTE, end: 0, allDay: false, location: '' },
    { title: 'Journée', start: now.getTime() + 5 * MINUTE, end: 0, allDay: true, location: '' }
  ],
  updatedAt: 1,
  error: null
}
const time = {
  projects: [{ id: 'p', name: 'Client' }],
  running: { project: 'p', start: now.getTime() - 5 * 60 * MINUTE },
  entries: []
}
const input = (widgets: WidgetInstance[]) => ({ widgets, feed: () => feed, time })
const titles = (widgets: WidgetInstance[], at = now): string[] =>
  dueReminders(input(widgets), at).map((r) => `${r.title} | ${r.body}`)

test('rappels : agenda, veille du compte à rebours, URSSAF dernier jour, chrono oublié', () => {
  expect(
    titles([
      widget('calendar', { url: 'u' }),
      widget('countdown', { title: 'Vacances', date: '2026-12-01' }),
      widget('countdown', { title: 'Loin', date: '2026-12-05' }),
      widget('micro', { period: 'mois' })
    ])
  ).toEqual([
    'Réunion | Dans 8 min, à 09:38 · Zoom',
    'Demain : Vacances | mardi 1 décembre',
    "Déclaration URSSAF : dernier jour | Chiffre d'affaires de octobre 2026, à déclarer avant le lundi 30 novembre.",
    'Chrono toujours en cours | « Client » tourne depuis 5 h 00. Oublié ?'
  ])
})

test('rappels : rien du jour avant 9 h, agenda coupé à 0, délai réglable', () => {
  const early = new Date(2026, 10, 30, 8, 0)
  const widgets = [widget('countdown', { date: '2026-11-30' }), widget('micro')]
  expect(titles(widgets, early)).toEqual([]) // chrono lancé à 4 h 30 : pas encore 4 h
  expect(titles([widget('calendar', { url: 'u', remind: 0 })])).toHaveLength(1) // le chrono seul
  expect(titles([widget('calendar', { url: 'u', remind: 30 })])).toHaveLength(3)
})

test('rappels : anniversaire demain, prélèvement demain, annuel 7 jours avant', () => {
  const people = [
    { id: 'a', name: 'Léa', day: '12-01', year: 2006 },
    { id: 'b', name: 'Tom', day: '12-05', year: null }
  ]
  const subs = [
    { id: 's', name: 'Netflix', amount: 1349, every: 'month' as const, start: '2026-01-01' },
    { id: 'y', name: 'Domaine', amount: 1200, every: 'year' as const, start: '2025-12-07' },
    { id: 'n', name: 'Spotify', amount: 1199, every: 'month' as const, start: '2026-01-15' }
  ]
  const input = { widgets: [], feed: () => null, time: { projects: [], entries: [], running: null }, people, subs }
  expect(dueReminders(input, now)).toEqual([]) // pas de widget : pas de rappel
  const titles = dueReminders(
    { ...input, widgets: [widget('birthdays'), widget('subscriptions')] },
    now
  ).map((r) => r.title)
  expect(titles).toEqual([
    'Demain : anniversaire de Léa',
    'Demain : Netflix',
    'Domaine se renouvelle dans 7 jours'
  ])
})
