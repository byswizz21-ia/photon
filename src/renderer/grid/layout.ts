// Passage entre le profil (JSON) et la grille : positions, nouvelles instances, réglages.
import type { GridStackWidget } from 'gridstack'
import type { WidgetInstance } from '../../shared/model'
import type { WidgetManifest, WidgetSettings } from '../widgets/types'

export const COLUMNS = 12

// Reporte la disposition 12 colonnes de la grille dans les widgets du profil, en place :
// les objets gardent leur identité (les cartes montées ne sont pas recréées). Ids inconnus ignorés.
export function applyLayout(widgets: WidgetInstance[], nodes: GridStackWidget[]): void {
  for (const node of nodes) {
    const widget = widgets.find((w) => w.id === node.id)
    if (!widget) continue
    widget.x = node.x ?? widget.x
    widget.y = node.y ?? widget.y
    widget.w = node.w ?? widget.w
    widget.h = node.h ?? widget.h
  }
}

// Nouvelle instance : id lisible et unique (clock, clock-2…), taille par défaut du widget.
// La position est choisie par la grille (première place libre).
export function createInstance(
  type: string,
  manifest: WidgetManifest,
  takenIds: string[]
): WidgetInstance {
  let id = type
  for (let n = 2; takenIds.includes(id); n++) id = `${type}-${n}`
  return { id, type, x: 0, y: 0, w: manifest.size.w, h: manifest.size.h, settings: {} }
}

// Réglages d'une instance : valeurs par défaut, remplacées par les valeurs sauvegardées de même type.
// Un réglage abîmé à la main (mauvais type, null) retombe sur sa valeur par défaut.
export function mergeSettings<S extends WidgetSettings>(defaults: S, saved: WidgetSettings): S {
  const merged: WidgetSettings = { ...defaults }
  for (const [key, fallback] of Object.entries(defaults)) {
    const value = saved[key]
    const sameType =
      value != null &&
      typeof value === typeof fallback &&
      Array.isArray(value) === Array.isArray(fallback)
    if (sameType) merged[key] = value
  }
  return merged as S
}
