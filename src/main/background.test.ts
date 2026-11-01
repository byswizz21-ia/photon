import { expect, test, vi } from 'vitest'

vi.mock('electron', () => ({ app: {}, dialog: {}, net: {}, protocol: {} }))
vi.mock('./data', () => ({ data: {} }))
vi.mock('./window', () => ({ withModal: vi.fn() }))
const { isCopyName } = await import('./background')

test('photon://images et fonts : seulement un nom de copie du bon type, jamais un chemin', () => {
  expect(isCopyName('image', '3f2b-9c.webp')).toBe(true)
  expect(isCopyName('image', '../settings.json')).toBe(false)
  expect(isCopyName('image', '..%2Fx.png')).toBe(false)
  expect(isCopyName('image', 'a/b.png')).toBe(false)
  expect(isCopyName('image', 'note.txt')).toBe(false)
  expect(isCopyName('font', 'Inter-3f2b9c1a.woff2')).toBe(true)
  expect(isCopyName('font', 'photo.png')).toBe(false)
})
