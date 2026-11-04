import { expect, test } from 'vitest'
import { armed, remaining, spellFromKey } from './spells'

test('recharge : secondes restantes arrondies au-dessus, 0 une fois prêt', () => {
  expect(remaining('A', undefined, 1000)).toBe(0)
  expect(remaining('A', 0, 0)).toBe(4)
  expect(remaining('A', 0, 3001)).toBe(1)
  expect(remaining('A', 0, 4000)).toBe(0)
  expect(remaining('R', 0, 100)).toBe(8)
  expect(remaining('E', 0, 2500)).toBe(0)
})

test('R : armé 4 s après le 1er appui', () => {
  expect(armed(null, 0)).toBe(false)
  expect(armed(1000, 4999)).toBe(true)
  expect(armed(1000, 5000)).toBe(false)
})

test('touches A Z E R, minuscules comprises, jamais avec Ctrl ou Alt', () => {
  const key = (k: string, ctrlKey = false) => ({ key: k, ctrlKey, altKey: false, metaKey: false })
  expect(spellFromKey(key('a'))).toBe('A')
  expect(spellFromKey(key('R'))).toBe('R')
  expect(spellFromKey(key('q'))).toBeNull()
  expect(spellFromKey(key('Enter'))).toBeNull()
  expect(spellFromKey(key('z', true))).toBeNull()
})
