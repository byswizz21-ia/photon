// Widget « Jours fériés » : les prochains fériés français, jours restants et ponts possibles.
// Calculés sur place (holidays.ts) : aucun appel réseau.
import ConfettiIcon from 'phosphor-svelte/lib/ConfettiIcon'
import type { WidgetManifest } from '../types'
import Holidays from './Holidays.svelte'

export type HolidaysSettings = { alsace: boolean } // Alsace-Moselle : 2 fériés de plus

const manifest: WidgetManifest<HolidaysSettings> = {
  name: 'Jours fériés',
  category: 'time',
  description: 'Prochains jours fériés et ponts possibles.',
  icon: ConfettiIcon,
  size: { w: 3, h: 3, minW: 2, minH: 1 },
  defaults: { alsace: false },
  component: Holidays
}

export default manifest
