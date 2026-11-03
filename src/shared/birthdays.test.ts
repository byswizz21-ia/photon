import { expect, test } from 'vitest'
import { nextBirthday, parseBirthdays, parseDayInput, upcoming, validDay } from './birthdays'

const now = new Date(2026, 10, 3, 9) // mardi 3 novembre 2026
const person = (day: string, year: number | null = null): Parameters<typeof nextBirthday>[0] => ({
  id: day,
  name: 'Léa',
  day,
  year
})

test('prochain anniversaire : aujourd’hui, plus tard, l’an prochain, âge', () => {
  expect(nextBirthday(person('11-03', 2006), now)).toEqual({ date: '2026-11-03', days: 0, age: 20 })
  expect(nextBirthday(person('12-25'), now)).toEqual({ date: '2026-12-25', days: 52, age: null })
  expect(nextBirthday(person('01-02', 2000), now)).toEqual({ date: '2027-01-02', days: 60, age: 27 })
})

test('29 février : le 28 les années non bissextiles', () => {
  expect(nextBirthday(person('02-29'), now).date).toBe('2027-02-28')
  expect(nextBirthday(person('02-29'), new Date(2027, 11, 1)).date).toBe('2028-02-29')
})

test('dates valides et tri', () => {
  expect(validDay('02-29')).toBe(true)
  expect(validDay('02-30')).toBe(false)
  expect(validDay('13-01')).toBe(false)
  const list = upcoming([person('12-25'), person('11-04')], now)
  expect(list.map((p) => p.day)).toEqual(['11-04', '12-25'])
})

test('fichier abîmé : on garde ce qui est lisible', () => {
  expect(parseBirthdays(null)).toEqual({ people: [] })
  expect(
    parseBirthdays({
      people: [
        { id: 'a', name: 'Léa', day: '03-14', year: 1999 },
        { id: 'b', name: 'Tom', day: '31-02', year: null },
        { id: 'c', name: 'Max', day: '05-01', year: 'vieux' }
      ]
    })
  ).toEqual({
    people: [
      { id: 'a', name: 'Léa', day: '03-14', year: 1999 },
      { id: 'c', name: 'Max', day: '05-01', year: null }
    ]
  })
})

test('saisie jj/mm ou jj/mm/aaaa', () => {
  expect(parseDayInput('14/03', now)).toEqual({ day: '03-14', year: null })
  expect(parseDayInput(' 1.2.1999 ', now)).toEqual({ day: '02-01', year: 1999 })
  expect(parseDayInput('29/02/2023', now)).toBeNull()
  expect(parseDayInput('29/02/2024', now)).toEqual({ day: '02-29', year: 2024 })
  expect(parseDayInput('14/03/2030', now)).toBeNull()
  expect(parseDayInput('demain', now)).toBeNull()
})
