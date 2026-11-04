// Horloge : heure 24 h en grand (les chiffres défilent) et date du jour. Designs : classique,
// « Journée » (secondes, heures écoulées), « Cadran » (les secondes font le tour) et « Jambes »
// (thème Urgot : 6 segments, un de plus toutes les 10 secondes).
import ClockIcon from 'phosphor-svelte/lib/ClockIcon'
import { cardPx } from '../../lib/DesignPicker.svelte'
import type { WidgetManifest } from '../types'
import Clock from './Clock.svelte'

export type ClockSettings = { seconds: boolean; design: string }

export const CLOCK_DESIGNS = [
  ['classic', 'Classique'],
  ['day', 'Journée'],
  ['dial', 'Cadran'],
  ['legs', 'Jambes']
] as const

const manifest: WidgetManifest<ClockSettings> = {
  name: 'Horloge',
  category: 'time',
  description: 'Heure en grand et date du jour.',
  icon: ClockIcon,
  size: { w: 6, h: 2, minW: 1, minH: 1 },
  defaults: { seconds: false, design: 'classic' },
  minSize: ({ design }) =>
    design === 'day' ? cardPx(6, 2) : design === 'dial' ? cardPx(3, 3) : null,
  component: Clock
}

export default manifest
