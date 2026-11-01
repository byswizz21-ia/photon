import { describe, expect, test } from 'vitest'
import { DEFAULT_ACCENT } from '../../shared/model'
import { accentFromGradient, accentFromPixels, hexToRgb, onAccent, toHsl, type Rgb } from './accent'

const pixels = (...colors: Rgb[]): Uint8ClampedArray =>
  Uint8ClampedArray.from(colors.flatMap(([r, g, b]) => [r, g, b, 255]))

const hslOf = (hex: string): number[] => toHsl(...hexToRgb(hex))

describe('accentFromPixels', () => {
  test('pixels ternes (gris, noir, blanc) : accent par défaut', () => {
    expect(accentFromPixels(pixels([128, 128, 128], [0, 0, 0], [255, 255, 255]))).toBe(
      DEFAULT_ACCENT
    )
  })

  test('garde la teinte et borne saturation et luminosité', () => {
    const [h = 0, s = 0, l = 0] = hslOf(accentFromPixels(pixels([170, 30, 30], [128, 128, 128])))
    expect(Math.min(h, 360 - h)).toBeLessThan(5) // rouge
    expect(s).toBeGreaterThanOrEqual(0.54)
    expect(l).toBeGreaterThanOrEqual(0.61)
    expect(l).toBeLessThanOrEqual(0.79)
  })
})

describe('accentFromGradient', () => {
  test("prend la couleur la plus saturée, quel que soit l'ordre", () => {
    const accent = accentFromGradient('#808080', '#2060d0')
    expect(accentFromGradient('#2060d0', '#808080')).toBe(accent)
    expect(hslOf(accent)[0]).toBeGreaterThan(200)
  })

  test('deux gris : accent par défaut', () => {
    expect(accentFromGradient('#202020', '#a0a0a0')).toBe(DEFAULT_ACCENT)
  })
})

test('onAccent : texte sombre sur accent clair, blanc sur accent foncé', () => {
  expect(onAccent('#7cc4ff')).toBe('#07080b')
  expect(onAccent('#000080')).toBe('#ffffff')
})
