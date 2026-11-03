import { expect, test } from 'vitest'
import { deviceKind, split } from './devices'

test('nom de sortie et genre d’appareil', () => {
  expect(split('Casque (Realtek Audio)')).toEqual(['Casque', 'Realtek Audio'])
  expect(split('Enceintes')).toEqual(['Enceintes', ''])
  expect(deviceKind('Casque (Realtek Audio)')).toBe('headphones')
  expect(deviceKind('Arctis 7+ Game')).toBe('headphones')
  expect(deviceKind('LG ULTRAGEAR (NVIDIA High Definition Audio)')).toBe('monitor')
  expect(deviceKind('Haut-parleurs (Realtek Audio)')).toBe('speaker')
})
