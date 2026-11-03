import { describe, expect, test } from 'vitest'
import {
  defaultProfile,
  migrateProfile,
  parseProfile,
  parseSettings,
  parseTheme,
  PROFILE_VERSION
} from './model'

describe('parseProfile', () => {
  test('aller-retour JSON sans perte', () => {
    const profile = defaultProfile()
    expect(parseProfile(JSON.parse(JSON.stringify(profile)))).toEqual(profile)
  })

  test("profil d'une ancienne version : champs manquants complétés, widget inconnu et réglages gardés", () => {
    const old = {
      name: 'Jeux',
      widgets: [{ id: 'radar', type: 'radar', x: 2, y: 3, w: 4, h: 2, settings: { zone: 'eu' } }]
    }
    expect(parseProfile(old)).toEqual({
      version: PROFILE_VERSION,
      name: 'Jeux',
      createdAt: 0,
      theme: null,
      focus: false,
      auto: { apps: [], hours: null },
      widgets: old.widgets
    })
  })

  test('conversions : seules les étapes manquantes, dans l’ordre', () => {
    const steps = [
      (p: Record<string, unknown>) => ({ ...p, log: [...(p.log as string[]), '0→1'] }),
      (p: Record<string, unknown>) => ({ ...p, log: [...(p.log as string[]), '1→2'] })
    ]
    expect(migrateProfile({ log: [] }, steps)).toEqual({ log: ['0→1', '1→2'], version: 2 })
    expect(migrateProfile({ version: 1, log: [] }, steps)).toEqual({ log: ['1→2'], version: 2 })
    expect(migrateProfile({ version: 2, log: [] }, steps)).toEqual({ log: [], version: 2 })
  })

  test("profil d'une version plus récente : numéro et champs inconnus gardés", () => {
    const future = {
      version: PROFILE_VERSION + 3,
      name: 'Futur',
      layout: 'masonry',
      widgets: [{ id: 'clock', type: 'clock', x: 0, y: 0, w: 2, h: 2, locked: true, settings: {} }]
    }
    const profile = parseProfile(future)
    expect(profile).toMatchObject({
      version: PROFILE_VERSION + 3,
      layout: 'masonry',
      widgets: [{ id: 'clock', locked: true }]
    })
    // aller-retour : rien de perdu à la sauvegarde
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
      version: PROFILE_VERSION,
      name: 'Principal',
      createdAt: 0,
      theme: null,
      focus: false,
      auto: { apps: [], hours: null },
      widgets: [{ id: 'a', type: 'clock', x: 0, y: 3, w: 12, h: 1, settings: { seconds: true } }]
    })
  })
})

test('réglages multi-écran : valeurs invalides → défaut', () => {
  const bounds = { x: 0, y: 0, width: 800, height: 600 }
  const s = parseSettings({
    screen: '../x',
    windowBoundsByScreens: { a: bounds, b: 'nope', c: { x: 'z' } }
  })
  expect(s.screen).toBe('mouse')
  expect(s.windowBoundsByScreens).toEqual({ a: bounds })
  expect(parseSettings({ screen: '2779098405' }).screen).toBe('2779098405')
})

test('intro : pas encore vue par défaut, seul true compte', () => {
  expect(parseSettings({}).introSeen).toBe(false)
  expect(parseSettings({ introSeen: 'oui' }).introSeen).toBe(false)
  expect(parseSettings({ introSeen: true }).introSeen).toBe(true)
})

test('sons : activés par défaut, volume borné, champ invalide → défaut', () => {
  expect(parseSettings({}).sound).toEqual({
    enabled: true,
    preset: 'glass',
    volume: 0.5,
    window: true,
    clicks: true,
    grid: true
  })
  expect(parseSettings({ sound: { enabled: false, volume: 3, clicks: 'non' } }).sound).toEqual({
    enabled: false,
    preset: 'glass',
    volume: 1,
    window: true,
    clicks: true,
    grid: true
  })
})

test('ambiance sonore : connue gardée, inconnue → Verre', () => {
  expect(parseSettings({ sound: { preset: 'piano' } }).sound.preset).toBe('piano')
  expect(parseSettings({ sound: { preset: 'toString' } }).sound.preset).toBe('glass')
  expect(parseSettings({ sound: { preset: 4 } }).sound.preset).toBe('glass')
})

test("fond « Lumineux » conservé, type inconnu → fond d'écran", () => {
  expect(parseTheme({ background: { type: 'glow' } }).background).toEqual({ type: 'glow' })
  expect(parseTheme({ background: { type: 'nope' } }).background).toEqual({ type: 'wallpaper' })
})

test('police du thème : défaut si absente, nom sans guillemet, bornes', () => {
  expect(parseTheme({}).font).toEqual({ family: '', weight: 0, scale: 1 })
  expect(
    parseTheme({ font: { family: ' Inter ', weight: 1000, italic: true, scale: 0.1 } }).font
  ).toEqual({ family: 'Inter', weight: 300, scale: 0.8 })
  expect(parseTheme({ font: { family: 'x"; } body { color: red' } }).font.family).toBe('')
  expect(parseTheme({ font: { weight: 120 } }).font.weight).toBe(100)
})

test('parseSettings : notifications activées par défaut, sources inconnues gardées', () => {
  expect(parseSettings({}).notifications).toEqual({ enabled: true, style: 'photon', sources: {} })
  expect(
    parseSettings({
      notifications: { enabled: false, sources: { music: false, futur: true, x: 1 } }
    }).notifications
  ).toEqual({ enabled: false, style: 'photon', sources: { music: false, futur: true } })
})

test('parseSettings : style des notifications, Photon sauf « windows » explicite', () => {
  const style = (v: unknown): unknown =>
    parseSettings({ notifications: { style: v } }).notifications.style
  expect(style('windows')).toBe('windows')
  expect(style('photon')).toBe('photon')
  expect(style('autre')).toBe('photon')
  expect(style(undefined)).toBe('photon')
})
