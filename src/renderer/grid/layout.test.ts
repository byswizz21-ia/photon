import { describe, expect, test } from 'vitest'
import type { WidgetInstance } from '../../shared/model'
import type { WidgetManifest } from '../widgets/types'
import { applyLayout, cellsFor, createInstance, mergeSettings } from './layout'

const widget = (id: string, type = 'clock'): WidgetInstance => ({
  id,
  type,
  x: 0,
  y: 0,
  w: 4,
  h: 2,
  settings: {}
})

describe('applyLayout', () => {
  test('reporte positions et tailles en gardant les mêmes objets', () => {
    const widgets = [widget('a'), widget('b')]
    const [a] = widgets
    applyLayout(widgets, [
      { id: 'a', x: 4, y: 1, w: 6, h: 3 },
      { id: 'b', x: 0, y: 2, minW: 4, minH: 4 }
    ])
    expect(widgets[0]).toBe(a)
    expect(widgets[0]).toMatchObject({ x: 4, y: 1, w: 6, h: 3 })
    // gridstack n'écrit pas une taille égale au minimum (ou à 1) : c'est elle.
    expect(widgets[1]).toMatchObject({ x: 0, y: 2, w: 4, h: 4 })
  })

  test('ignore les ids inconnus ; un widget absent de la grille garde sa place', () => {
    const widgets = [widget('a'), { ...widget('z', 'missing'), x: 8, y: 5 }]
    applyLayout(widgets, [{ id: 'ghost', x: 3, y: 3, w: 1, h: 1 }])
    expect(widgets.map(({ x, y }) => [x, y])).toEqual([
      [0, 0],
      [8, 5]
    ])
  })
})

describe('createInstance', () => {
  const manifest = { size: { w: 3, h: 2, minW: 1, minH: 1 } } as WidgetManifest

  test('id lisible et unique, taille par défaut du widget', () => {
    expect(createInstance('clock', manifest, [])).toEqual({
      id: 'clock',
      type: 'clock',
      x: 0,
      y: 0,
      w: 3,
      h: 2,
      settings: {}
    })
    expect(createInstance('clock', manifest, ['clock', 'clock-2']).id).toBe('clock-3')
  })
})

describe('mergeSettings', () => {
  const defaults = { seconds: false, apps: [] as string[], label: 'x' }

  test('garde les valeurs sauvegardées du bon type, sinon la valeur par défaut', () => {
    expect(mergeSettings(defaults, { seconds: true, apps: ['C:/a.lnk'], extra: 1 })).toEqual({
      seconds: true,
      apps: ['C:/a.lnk'],
      label: 'x'
    })
    expect(mergeSettings(defaults, { seconds: 'oui', apps: 'C:/a.lnk', label: null })).toEqual(
      defaults
    )
  })
})

test('cases pour une place minimale en px', () => {
  // Case de 100 px, marge 10 : 4 cases = 400 - 20 - 2 = 378 px de contenu.
  expect(cellsFor(300, 100, 10)).toBe(4) // 3 cases n'en donnent que 278
  expect(cellsFor(278, 100, 10)).toBe(3)
  expect(cellsFor(340, 150, 10)).toBe(3)
})
