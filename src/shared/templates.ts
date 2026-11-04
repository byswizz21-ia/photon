// Modèles proposés à la création d'un profil (grille de 12 colonnes). Les widgets à configurer
// (lanceur, agenda) arrivent vides : leur case explique quoi faire. theme : thème prêt attaché
// au profil (themes.ts), écrit dans themes/ s'il n'y est pas encore.
import type { WidgetInstance } from './model'

type Slot = [type: string, x: number, y: number, w: number, h: number, settings?: object]

const widgets = (slots: Slot[]): WidgetInstance[] =>
  slots.map(([type, x, y, w, h, settings = {}]) => ({
    id: type,
    type,
    x,
    y,
    w,
    h,
    settings: { ...settings }
  }))

export const TEMPLATES: Record<
  string,
  { name: string; focus?: boolean; theme?: string; widgets: () => WidgetInstance[] }
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
  },
  // Thème Urgot (League of Legends) : splash à glisser soi-même dans la case Image.
  urgot: {
    name: 'Urgot',
    theme: 'urgot',
    widgets: () =>
      widgets([
        ['image', 0, 0, 4, 4, { kicker: 'Top · Zaun', title: 'Urgot', subtitle: 'le Cuirassé' }],
        ['clock', 4, 0, 5, 2, { design: 'legs' }],
        ['system', 9, 0, 3, 2],
        ['spells', 4, 2, 5, 2],
        ['gehenne', 9, 2, 3, 3],
        ['disks', 0, 4, 4, 2, { design: 'execute', threshold: 25 }],
        ['matches', 4, 4, 5, 3, { sport: 'lol', filter: 'LEC' }],
        ['ytmusic', 9, 5, 3, 2],
        ['launcher', 0, 6, 4, 1]
      ])
  }
}
