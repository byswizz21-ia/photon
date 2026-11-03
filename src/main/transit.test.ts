import { expect, test, vi } from 'vitest'

vi.mock('electron', () => ({ net: {} }))
vi.mock('./data', () => ({ data: { profile: { widgets: [] } } }))
vi.mock('./window', () => ({ isVisible: () => false }))
const { navitiaTime, parseSchedules } = await import('./transit')

test('heure Navitia (heure locale de Dijon)', () => {
  expect(navitiaTime('20261103T131033')).toBe(new Date(2026, 10, 3, 13, 10, 33).getTime())
  expect(navitiaTime('demain')).toBeNull()
})

test('passages par direction, triés, temps réel, passés retirés', () => {
  const now = new Date(2026, 10, 3, 13, 10).getTime()
  const json = {
    terminus_schedules: [
      {
        display_informations: { direction: 'Epirey Capnord (Dijon)' },
        date_times: [
          { date_time: '20261103T132700', data_freshness: 'base_schedule' },
          { date_time: '20261103T131233', data_freshness: 'realtime' },
          { date_time: '20261103T130000', data_freshness: 'realtime' }
        ]
      },
      { route: { direction: { name: 'Fontaine d’Ouche' } }, date_times: [] }
    ]
  }
  expect(parseSchedules(json, now)).toEqual([
    {
      direction: 'Epirey Capnord',
      times: [
        { at: new Date(2026, 10, 3, 13, 12, 33).getTime(), realtime: true },
        { at: new Date(2026, 10, 3, 13, 27).getTime(), realtime: false }
      ]
    },
    { direction: 'Fontaine d’Ouche', times: [] }
  ])
})
