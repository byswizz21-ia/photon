import { expect, test } from 'vitest'
import { diffLabel, isZone, searchZones, zoneLabel, zoneTime } from './zones'

// 2 novembre 2026, 23 h 30 à Paris (UTC+1, heure d'hiver).
const now = new Date(Date.UTC(2026, 10, 2, 22, 30))

test('heure, jour et décalage d’un fuseau', () => {
  expect(zoneTime('Asia/Tokyo', now, 'Europe/Paris')).toEqual({
    time: '07:30',
    dayShift: 1,
    diff: 8 * 60,
    night: false
  })
  const ny = zoneTime('America/New_York', now, 'Europe/Paris')
  expect(ny).toMatchObject({ time: '17:30', dayShift: 0, diff: -6 * 60, night: false })
  const india = zoneTime('Asia/Kolkata', now, 'Europe/Paris')
  expect(india).toMatchObject({ time: '04:00', dayShift: 1, diff: 4 * 60 + 30, night: true })
  expect(zoneTime('Pacific/Honolulu', now, 'Europe/Paris').dayShift).toBe(0)
})

test('heure d’été décalée : écart de 5 h entre Paris et New York fin mars', () => {
  const march = new Date(Date.UTC(2026, 2, 20, 12)) // New York déjà à l'heure d'été, pas Paris
  expect(zoneTime('America/New_York', march, 'Europe/Paris').diff).toBe(-5 * 60)
})

test('heure locale à la seconde près : décalage toujours en minutes entières', () => {
  const late = new Date(2026, 10, 2, 16, 44, 50) // 50 s : ne doit pas arrondir à la minute suivante
  const there = zoneTime('UTC', late)
  expect(Math.abs(there.diff % 60)).toBe(0) // abs : -60 % 60 donne -0
})

test('libellés et recherche', () => {
  expect(diffLabel(0)).toBe('même heure')
  expect(diffLabel(360)).toBe('+6 h')
  expect(diffLabel(-270)).toBe('−4 h 30')
  expect(zoneLabel('America/Argentina/Buenos_Aires')).toBe('Buenos Aires')
  const all = ['America/New_York', 'Europe/Paris', 'America/Sao_Paulo', 'Asia/Tokyo']
  expect(searchZones(all, 'new y', 5)).toEqual(['America/New_York'])
  expect(searchZones(all, 'São', 5)).toEqual(['America/Sao_Paulo'])
  expect(searchZones(all, '  ', 5)).toEqual([])
  expect(isZone('Europe/Paris')).toBe(true)
  expect(isZone('Mars/Olympus')).toBe(false)
})
