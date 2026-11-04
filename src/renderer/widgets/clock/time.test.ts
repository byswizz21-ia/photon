import { expect, test } from 'vitest'
import { dayOfYear, isoWeek, litLeg } from './time'

test('semaine ISO, y compris à cheval sur deux années', () => {
  expect(isoWeek(new Date(2026, 10, 3))).toBe(45)
  expect(isoWeek(new Date(2027, 0, 1))).toBe(53) // vendredi : semaine 53 de 2026
  expect(isoWeek(new Date(2024, 11, 30))).toBe(1) // lundi : semaine 1 de 2025
})

test('jour de l’année', () => {
  expect(dayOfYear(new Date(2026, 0, 1))).toBe(1)
  expect(dayOfYear(new Date(2026, 10, 3))).toBe(307)
  expect(dayOfYear(new Date(2024, 11, 31))).toBe(366)
})

test('jambes : une de plus toutes les 10 secondes', () => {
  expect(litLeg(0)).toBe(0)
  expect(litLeg(9)).toBe(0)
  expect(litLeg(10)).toBe(1)
  expect(litLeg(59)).toBe(5)
  expect(litLeg(61)).toBe(5) // seconde intercalaire
})
