import { expect, test } from 'vitest'
import { dayKey } from '../../lib/day'
import { parseHabits, streak, toggleDay } from './habits'

const now = new Date(2026, 10, 2, 9) // lundi 2 novembre 2026

test('jour local, avant et après, changement de mois', () => {
  expect(dayKey(now)).toBe('2026-11-02')
  expect(dayKey(now, -2)).toBe('2026-10-31')
  expect(dayKey(new Date(2026, 11, 31), 1)).toBe('2027-01-01')
})

test('série : aujourd’hui fait, pas encore fait, cassée', () => {
  expect(streak(['2026-10-31', '2026-11-01', '2026-11-02'], now)).toBe(3)
  expect(streak(['2026-10-31', '2026-11-01'], now)).toBe(2) // la journée n'est pas finie
  expect(streak(['2026-10-30', '2026-11-02'], now)).toBe(1)
  expect(streak(['2026-10-30'], now)).toBe(0)
  expect(streak([], now)).toBe(0)
})

test('cocher puis décocher un jour', () => {
  const habit = { id: 'a', name: 'Sport', days: ['2026-11-02'] }
  toggleDay(habit, '2026-11-01')
  expect(habit.days).toEqual(['2026-11-01', '2026-11-02'])
  toggleDay(habit, '2026-11-02')
  expect(habit.days).toEqual(['2026-11-01'])
})

test('fichier abîmé : on garde ce qui est lisible', () => {
  expect(parseHabits(null)).toEqual({ habits: [] })
  const raw = {
    habits: [
      { id: 'a', name: 'Lire', days: ['2026-11-02', 'hier', 3, '2026-11-01', '2026-11-02'] },
      { id: 'b', name: 42, days: [] },
      null
    ]
  }
  expect(parseHabits(raw)).toEqual({
    habits: [{ id: 'a', name: 'Lire', days: ['2026-11-01', '2026-11-02'] }]
  })
})
