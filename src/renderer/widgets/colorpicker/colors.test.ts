import { expect, test } from 'vitest'
import { formats, isHex } from './colors'

test('formats HEX, RGB, HSL', () => {
  expect(formats('#7cc4ff').map((f) => f.value)).toEqual([
    '#7CC4FF',
    'rgb(124, 196, 255)',
    'hsl(207, 100%, 74%)'
  ])
  expect(formats('#ff00ff')[2]?.value).toBe('hsl(300, 100%, 50%)')
  expect(formats('#808080')[2]?.value).toBe('hsl(0, 0%, 50%)')
})

test('validation', () => {
  expect(isHex('#a1b2c3')).toBe(true)
  expect(isHex('#A1B2C3')).toBe(false) // l'outil natif répond en minuscules
  expect(isHex('rouge')).toBe(false)
})
