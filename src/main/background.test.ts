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

test('vidéos : Range borné au fichier, 416 hors du fichier', async () => {
  const { byteRange } = await import('./background')
  expect(byteRange(null, 1000)).toBeNull()
  expect(byteRange('bytes=0-', 1000)).toEqual({ start: 0, end: 999 })
  expect(byteRange('bytes=100-199', 1000)).toEqual({ start: 100, end: 199 })
  expect(byteRange('bytes=900-5000', 1000)).toEqual({ start: 900, end: 999 })
  expect(byteRange('bytes=1000-', 1000)).toBe('invalid')
  expect(byteRange('bytes=-500', 1000)).toBeNull() // suffixe : fichier entier
  expect(isCopyName('video', 'clip-3f2b9c1a.mp4')).toBe(true)
  expect(isCopyName('video', 'clip.png')).toBe(false)
})
