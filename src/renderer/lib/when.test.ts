import { expect, test } from 'vitest'
import { dayLabel, timeLabel } from './when'

test('jour relatif et heure', () => {
  const now = new Date(2026, 10, 3, 9)
  expect(dayLabel(new Date(2026, 10, 3, 23).getTime(), now)).toBe("aujourd'hui")
  expect(dayLabel(new Date(2026, 10, 4, 1).getTime(), now)).toBe('demain')
  expect(dayLabel(new Date(2026, 10, 2, 20).getTime(), now)).toBe('hier')
  expect(dayLabel(new Date(2026, 10, 7, 20).getTime(), now)).toBe('sam. 7 nov.')
  expect(timeLabel(new Date(2026, 10, 7, 20, 45).getTime())).toBe('20:45')
})
