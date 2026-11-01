import { expect, test, vi } from 'vitest'
import type { ProfileInfo } from '../shared/model'
import { parseAuto } from '../shared/model'

vi.mock('electron', () => ({}))
vi.mock('./data', () => ({ data: {} }))
vi.mock('./system', () => ({}))
vi.mock('./window', () => ({}))
const { inHours, pickAuto } = await import('./auto')

const week = [1, 2, 3, 4, 5]
// 2026-11-02 = lundi, 2026-11-07 = samedi
const at = (day: number, time: string): Date => new Date(`2026-11-0${day}T${time}:00`)

test('plage horaire : jours, bornes, passage de minuit', () => {
  const work = { from: '09:00', to: '18:00', days: week }
  expect(inHours(work, at(2, '09:00'))).toBe(true)
  expect(inHours(work, at(2, '18:00'))).toBe(false)
  expect(inHours(work, at(7, '10:00'))).toBe(false) // samedi
  const night = { from: '22:00', to: '02:00', days: [5] } // vendredi soir
  expect(inHours(night, at(6, '23:30'))).toBe(true) // vendredi 23 h 30
  expect(inHours(night, at(7, '01:00'))).toBe(true) // samedi 1 h, commencé vendredi
  expect(inHours(night, at(7, '23:00'))).toBe(false)
  expect(inHours(null, at(2, '10:00'))).toBe(false)
})

const profile = (id: string, apps: string[] = []): ProfileInfo => ({
  id,
  name: id,
  focus: false,
  auto: { apps, hours: null }
})

test('app lancée prioritaire, puis début de plage ; jamais le profil actif', () => {
  const profiles = [profile('main'), profile('gaming', ['geometrydash.exe']), profile('work')]
  const none = new Set<string>()
  const gd = new Set(['geometrydash.exe'])
  expect(pickAuto(profiles, 'main', gd, new Set(['work']), none)?.id).toBe('gaming')
  expect(pickAuto(profiles, 'gaming', gd, none, none)).toBeUndefined()
  expect(pickAuto(profiles, 'main', none, new Set(['work']), none)?.id).toBe('work')
  // plage déjà en cours au tour précédent : pas de nouvelle bascule
  expect(pickAuto(profiles, 'main', none, new Set(['work']), new Set(['work']))).toBeUndefined()
})

test('règles lues du disque : invalides écartées', () => {
  expect(
    parseAuto({
      apps: ['GeometryDash.exe', 'evil.bat', '..\\x.exe', 'geometrydash.exe'],
      hours: { from: '09:00', to: '25:00', days: [1] }
    })
  ).toEqual({ apps: ['geometrydash.exe'], hours: null })
  expect(parseAuto({ hours: { from: '09:00', to: '18:00', days: [5, 1, 9, 1] } }).hours).toEqual({
    from: '09:00',
    to: '18:00',
    days: [1, 5]
  })
})
