// Modèles proposés à la création d'un profil (grille de 12 colonnes). Les widgets à configurer
// (lanceur, agenda) arrivent vides : leur case explique quoi faire.
import type { WidgetInstance } from './model'

type Slot = [type: string, x: number, y: number, w: number, h: number]

const widgets = (slots: Slot[]): WidgetInstance[] =>
  slots.map(([type, x, y, w, h]) => ({ id: type, type, x, y, w, h, settings: {} }))

export const TEMPLATES: Record<
  string,
  { name: string; focus?: boolean; widgets: () => WidgetInstance[] }
> = {
  work: {
    name: 'Travail',
    widgets: () =>
      widgets([
        ['clock', 0, 0, 8, 2],
        ['system', 8, 0, 4, 2],
        ['calendar', 0, 2, 5, 4],
        ['claude', 5, 2, 7, 4]
      ])
  },
  chill: {
    name: 'Chill',
    widgets: () =>
      widgets([
        ['ytmusic', 0, 0, 6, 2],
        ['clock', 6, 0, 6, 2],
        ['launcher', 0, 2, 12, 2]
      ])
  },
  gaming: {
    name: 'Gaming',
    widgets: () =>
      widgets([
        ['system', 0, 0, 4, 2],
        ['disks', 4, 0, 4, 2],
        ['ytmusic', 8, 0, 4, 2],
        ['launcher', 0, 2, 12, 2]
      ])
  },
  focus: {
    name: 'Focus',
    focus: true,
    widgets: () =>
      widgets([
        ['clock', 0, 0, 8, 2],
        ['pomodoro', 8, 0, 4, 2],
        ['todo', 0, 2, 6, 4],
        ['notes', 6, 2, 6, 4]
      ])
  },
  minimal: {
    name: 'Minimal',
    widgets: () => widgets([['clock', 0, 0, 12, 3]])
  }
}
