import { expect, test } from 'vitest'
import { dayKey } from '../../../shared/day'
import { best, doneIn, parseHabits, streak, toggleDay } from './habits'

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

test('record et jours faits sur 30 jours', () => {
  const days = ['2026-09-30', '2026-10-01', '2026-10-02', '2026-10-20', '2026-11-01', '2026-11-02']
  expect(best(days)).toBe(3) // à cheval sur septembre et octobre
  expect(best([])).toBe(0)
  expect(doneIn(days, now, 30)).toBe(3) // depuis le 4 octobre
  expect(doneIn(days, now, 1)).toBe(1)
})
