import { expect, test } from 'vitest'
import { average, cleanGrades, mark, needed, parseGrade } from './grades'

test('moyenne pondérée, barèmes différents', () => {
  expect(average([])).toBeNull()
  expect(average([{ value: 12, outOf: 20, coef: 1 }])).toBe(12)
  const grades = [
    { value: 15, outOf: 20, coef: 2 },
    { value: 4, outOf: 10, coef: 1 } // 8/20
  ]
  expect(average(grades)).toBeCloseTo((15 * 2 + 8) / 3)
})

test('note à viser au prochain contrôle', () => {
  const grades = [{ value: 8, outOf: 20, coef: 1 }]
  expect(needed(grades, 10, 1)).toBe(12)
  expect(needed(grades, 10, 3)).toBeCloseTo(10.667, 2)
  expect(needed(grades, 16, 1)).toBe(24) // impossible
  expect(needed([], 12, 1)).toBe(12)
})

test('saisie d’une note', () => {
  expect(parseGrade('15')).toEqual({ value: 15, outOf: 20 })
  expect(parseGrade('7,5/10')).toEqual({ value: 7.5, outOf: 10 })
  expect(parseGrade(' 18 / 20 ')).toEqual({ value: 18, outOf: 20 })
  expect(parseGrade('22')).toBeNull()
  expect(parseGrade('5/0')).toBeNull()
  expect(parseGrade('bien')).toBeNull()
})

test('réglages abîmés, affichage', () => {
  const raw = [{ value: 12, outOf: 20, coef: 1 }, { value: 30, outOf: 20, coef: 1 }, null, 'x']
  expect(cleanGrades(raw)).toEqual([{ value: 12, outOf: 20, coef: 1 }])
  expect(mark(14.256)).toBe('14,26')
  expect(mark(12)).toBe('12')
})
