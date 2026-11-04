import { expect, test } from 'vitest'
import type { Disk } from '../../../shared/api'
import { executable, format, freeShare, threshold, usedShare } from './disk'

const GB = 1024 ** 3
const disk = (free: number, total: number): Disk => ({ mount: 'C:', free, total })

test('tailles : Mo sous 1 Go, Go entiers, To à virgule', () => {
  expect(format(512 * 1024 ** 2)).toEqual({ value: '512', unit: 'Mo' })
  expect(format(412.9 * GB)).toEqual({ value: '412', unit: 'Go' })
  expect(format(1228.8 * GB)).toEqual({ value: '1,2', unit: 'To' })
})

test('parts libre et utilisée, disque inconnu à 0', () => {
  expect(freeShare(disk(25, 100))).toBe(0.25)
  expect(usedShare(disk(25, 100))).toBe(0.75)
  expect(freeShare(disk(5, 0))).toBe(0)
  expect(usedShare(disk(5, 0))).toBe(0)
})

test("seuil d'exécution : 25 % par défaut, borné de 10 à 40 par pas de 5", () => {
  expect(threshold(undefined)).toBe(25)
  expect(threshold('30')).toBe(25)
  expect(threshold(33)).toBe(35)
  expect(threshold(2)).toBe(10)
  expect(threshold(90)).toBe(40)
})

test('exécutable : strictement sous le seuil, jamais un disque de taille inconnue', () => {
  expect(executable(disk(9, 100), 25)).toBe(true)
  expect(executable(disk(25, 100), 25)).toBe(false)
  expect(executable(disk(44, 100), 25)).toBe(false)
  expect(executable(disk(0, 0), 25)).toBe(false)
})
