import { expect, test } from 'vitest'
import { decibels, FLOOR_DB, share, verdict } from './level'

test('décibels : silence, plein signal, moitié', () => {
  expect(decibels(new Float32Array(128))).toBe(FLOOR_DB)
  expect(decibels(new Float32Array(128).fill(1))).toBeCloseTo(0)
  expect(decibels(new Float32Array(128).fill(0.5))).toBeCloseTo(-6.02, 1)
})

test('barre et avis', () => {
  expect(share(FLOOR_DB)).toBe(0)
  expect(share(0)).toBe(1)
  expect(share(-30)).toBeCloseTo(0.5)
  expect(verdict(-55).tone).toBe('idle')
  expect(verdict(-40).tone).toBe('low')
  expect(verdict(-12).tone).toBe('ok')
  expect(verdict(-1).tone).toBe('high')
})
