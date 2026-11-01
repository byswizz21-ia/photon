import { expect, test } from 'vitest'
import { duration, parseTime, spent, startOfWeek, toggle } from './time'

const at = (day: number, h: number, m = 0): number => new Date(2026, 10, day, h, m).getTime()

test('chrono : démarrer, changer de projet, arrêter ; totaux bornés à la période', () => {
  const data = parseTime({
    projects: [
      { id: 'a', name: 'Client A' },
      { id: 'b', name: 'Client B' }
    ],
    entries: [{ project: 'a', start: at(1, 23), end: at(2, 1) }] // à cheval sur minuit
  })
  toggle(data, 'a', at(2, 9))
  toggle(data, 'b', at(2, 10)) // arrête A, démarre B
  expect(data.running).toEqual({ project: 'b', start: at(2, 10) })
  toggle(data, 'b', at(2, 10, 30))
  expect(data.running).toBeNull()
  const today = new Date(at(2, 0)).getTime()
  expect(duration(spent(data, 'a', today, at(2, 12)))).toBe('2 h 00') // 1 h la nuit + 1 h
  expect(duration(spent(data, 'b', today, at(2, 12)))).toBe('30 min')
  toggle(data, 'a', at(2, 12))
  expect(spent(data, 'a', today, at(2, 12, 15))).toBe(2 * 3_600_000 + 15 * 60_000) // en cours
})

test('lecture : projets inconnus et entrées invalides retirés', () => {
  const data = parseTime({
    projects: [{ id: 'a', name: 'A' }, { id: 1 }],
    running: { project: 'zz', start: 5 },
    entries: [
      { project: 'a', start: 10, end: 5 },
      { project: 'zz', start: 1, end: 2 }
    ]
  })
  expect(data).toEqual({ projects: [{ id: 'a', name: 'A' }], running: null, entries: [] })
  expect(parseTime(null)).toEqual({ projects: [], running: null, entries: [] })
})

test('semaine depuis lundi', () => {
  expect(startOfWeek(at(1, 15))).toBe(new Date(2026, 9, 26).getTime()) // dimanche 1er → lundi 26
  expect(startOfWeek(at(2, 15))).toBe(new Date(2026, 10, 2).getTime()) // lundi
})
