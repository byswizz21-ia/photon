import { expect, test, vi } from 'vitest'

vi.mock('electron', () => ({ app: {}, dialog: {}, net: {}, protocol: {} }))
vi.mock('./data', () => ({ data: {} }))
vi.mock('./window', () => ({ withModal: vi.fn() }))
const { isImageName } = await import('./background')

test('photon://images : seulement un nom de copie, jamais un chemin', () => {
  expect(isImageName('3f2b-9c.webp')).toBe(true)
  expect(isImageName('../settings.json')).toBe(false)
  expect(isImageName('..%2Fx.png')).toBe(false)
  expect(isImageName('a/b.png')).toBe(false)
  expect(isImageName('note.txt')).toBe(false)
})
