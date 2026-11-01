import { expect, test, vi } from 'vitest'

vi.mock('electron', () => ({ screen: {} }))
const { chooseDisplay } = await import('./screens')

const [left, main, right] = [{ id: 1 }, { id: 2 }, { id: 3 }]
const all = [left, main, right]
const pick = (busy: number[], choice: string, cursor = left): unknown =>
  chooseDisplay(all, new Set(busy), choice, cursor, main)

test('écran choisi, sauf s’il est en plein écran', () => {
  expect(pick([], 'mouse')).toEqual({ display: left, mini: false })
  expect(pick([], 'primary')).toEqual({ display: main, mini: false })
  expect(pick([], '3')).toEqual({ display: right, mini: false })
  // écran choisi occupé → écran de la souris
  expect(pick([3], '3')).toEqual({ display: left, mini: false })
  // choisi et souris occupés → premier écran libre
  expect(pick([1, 3], '3')).toEqual({ display: main, mini: false })
})

test('écran fixe débranché → écran de la souris ; aucun écran libre → barre seule', () => {
  expect(pick([], '99', right)).toEqual({ display: right, mini: false })
  expect(pick([1, 2, 3], 'primary')).toEqual({ display: main, mini: true })
  expect(chooseDisplay([main], new Set([2]), 'mouse', main, main)).toEqual({
    display: main,
    mini: true
  })
})
