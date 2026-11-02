// Widget « Habitudes » : cocher chaque jour ce qu'on veut tenir (sport, lecture, eau…) et voir sa
// série. Données partagées entre profils (data/habits.json), ou propres au profil (réglage own).
import FlameIcon from 'phosphor-svelte/lib/FlameIcon'
import type { WidgetManifest } from '../types'
import Habits from './Habits.svelte'

export type HabitsSettings = { own: boolean }

const manifest: WidgetManifest<HabitsSettings> = {
  name: 'Habitudes',
  icon: FlameIcon,
  size: { w: 4, h: 3, minW: 3, minH: 2 },
  defaults: { own: false },
  component: Habits
}

export default manifest
