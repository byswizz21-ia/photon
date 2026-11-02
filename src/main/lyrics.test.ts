import { expect, test, vi } from 'vitest'

vi.mock('electron', () => ({ net: {} }))
const { parseLrc } = await import('./lyrics')

test('paroles LRC : temps en secondes, lignes vides et balises ignorées, triées', () => {
  const lrc =
    '[ar: Daft Punk]\n[00:35.11]Our ends\n[00:30.64] Like the legend \n[01:02.00]\n[1:05]Look'
  expect(parseLrc(lrc)).toEqual([
    { time: 30.64, text: 'Like the legend' },
    { time: 35.11, text: 'Our ends' },
    { time: 65, text: 'Look' }
  ])
})
