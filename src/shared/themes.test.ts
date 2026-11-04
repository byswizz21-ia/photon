import { expect, test } from 'vitest'
import { parseProfile, parseTheme, PROFILE_VERSION } from './model'
import { TEMPLATES } from './templates'
import { THEME_PRESETS } from './themes'

test('thème Urgot : valide tel quel (relu sans perte)', () => {
  const urgot = THEME_PRESETS.urgot!.theme()
  expect(parseTheme(urgot)).toEqual(urgot)
  expect(urgot).toMatchObject({
    accent: '#b4f24a',
    opacity: 0.6,
    radius: 8,
    blur: 48,
    tint: '#0b0e09',
    glowSecondary: '#d4672a',
    background: { type: 'glow', scene: 'urgot' }
  })
})

test('modèles : thème attaché connu, profil valide, ids uniques', () => {
  for (const template of Object.values(TEMPLATES)) {
    if (template.theme) expect(THEME_PRESETS).toHaveProperty(template.theme)
    const widgets = template.widgets()
    const profile = parseProfile({ version: PROFILE_VERSION, name: template.name, widgets })
    expect(profile.widgets).toHaveLength(widgets.length)
  }
})

test('modèle Urgot : disposition de la maquette, réglages des widgets', () => {
  const widgets = TEMPLATES.urgot!.widgets()
  const at = Object.fromEntries(widgets.map((w) => [w.type, [w.x, w.y, w.w, w.h]]))
  expect(at).toEqual({
    image: [0, 0, 4, 4],
    clock: [4, 0, 5, 2],
    system: [9, 0, 3, 2],
    spells: [4, 2, 5, 2],
    gehenne: [9, 2, 3, 3],
    disks: [0, 4, 4, 2],
    matches: [4, 4, 5, 3],
    ytmusic: [9, 5, 3, 2],
    launcher: [0, 6, 4, 1]
  })
  expect(widgets.find((w) => w.type === 'matches')?.settings).toEqual({
    sport: 'lol',
    filter: 'LEC'
  })
  // Deux appels : deux objets de réglages distincts (un profil n'en modifie pas un autre).
  expect(TEMPLATES.urgot!.widgets()[0]!.settings).not.toBe(widgets[0]!.settings)
})
