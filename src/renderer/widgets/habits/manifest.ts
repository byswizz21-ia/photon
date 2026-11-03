// Widget « Habitudes » : cocher chaque jour ce qu'on veut tenir (sport, lecture, eau…) et voir sa
// série. Données partagées entre profils (data/habits.json), ou propres au profil (réglage own).
// Designs : classique, « Aujourd'hui », « Historique » (20 semaines).
import FlameIcon from 'phosphor-svelte/lib/FlameIcon'
import { cardPx } from '../../lib/DesignPicker.svelte'
import type { WidgetManifest } from '../types'
import Habits from './Habits.svelte'

export type HabitsSettings = { own: boolean; design: string }

export const HABITS_DESIGNS = [
  ['classic', 'Classique'],
  ['today', 'Aujourd’hui'],
  ['history', 'Historique']
] as const

const manifest: WidgetManifest<HabitsSettings> = {
  name: 'Habitudes',
  category: 'organize',
  description: 'Cocher chaque jour ses habitudes et suivre sa série.',
  icon: FlameIcon,
  size: { w: 4, h: 3, minW: 3, minH: 2 },
  defaults: { own: false, design: 'classic' },
  minSize: ({ design }) =>
    design === 'today' ? cardPx(4, 3) : design === 'history' ? cardPx(6, 3) : null,
  component: Habits
}

export default manifest
