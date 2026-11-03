import { expect, test, vi } from 'vitest'

vi.mock('electron', () => ({}))
vi.mock('./data', () => ({ data: {} }))
vi.mock('./focus', () => ({}))
vi.mock('./toast', () => ({}))
vi.mock('./window', () => ({}))

const { delivery } = await import('./notify')
const photon = { style: 'photon' } as const

test('delivery : cartes de Photon, Windows en plein écran ou Ne pas déranger', () => {
  expect(delivery(photon, null, false, false)).toBe('photon')
  expect(delivery(photon, 'fullscreen', false, false)).toBe('windows')
  expect(delivery(photon, 'fullscreen', false, true)).toBe('windows') // jeu : même un rappel
  expect(delivery(photon, 'dnd', false, false)).toBe('windows')
  expect(delivery(photon, 'dnd', false, true)).toBe('photon') // rappel : passe Ne pas déranger
})

test('delivery : Photon ouvert garde la carte, style Windows toujours Windows', () => {
  expect(delivery(photon, 'fullscreen', true, false)).toBe('photon')
  expect(delivery({ style: 'windows' }, null, true, true)).toBe('windows')
})
