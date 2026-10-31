import { describe, expect, test } from 'vitest'
import { defaultProfile, parseProfile } from './model'

describe('parseProfile', () => {
  test('aller-retour JSON sans perte', () => {
    const profile = defaultProfile()
    expect(parseProfile(JSON.parse(JSON.stringify(profile)))).toEqual(profile)
  })

  test('racine invalide : erreur (le store reprend alors le .bak)', () => {
    expect(() => parseProfile(null)).toThrow()
    expect(() => parseProfile([])).toThrow()
    expect(() => parseProfile({ name: 'Travail', widgets: 'clock' })).toThrow()
  })

  test('écarte les widgets invalides et les doublons, borne positions et tailles', () => {
    const profile = parseProfile({
      name: '',
      theme: '../evil',
      widgets: [
        { id: 'a', type: 'clock', x: -3, y: 2.6, w: 40, h: 0, settings: { seconds: true } },
        { id: 'a', type: 'disks', x: 0, y: 0, w: 2, h: 2 },
        { id: 'b', type: '../hack', x: 0, y: 0, w: 2, h: 2 },
        { type: 'clock' },
        'clock'
      ]
    })
    expect(profile).toEqual({
      name: 'Principal',
      theme: null,
      widgets: [{ id: 'a', type: 'clock', x: 0, y: 3, w: 12, h: 1, settings: { seconds: true } }]
    })
  })
})
