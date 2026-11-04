// Widget « Sorts » (thème Urgot) : 4 tuiles A Z E R, chacune une action de Windows.
import LightningIcon from 'phosphor-svelte/lib/LightningIcon'
import type { WidgetManifest } from '../types'
import Spells from './Spells.svelte'

export type SpellsSettings = Record<string, never>

const manifest: WidgetManifest<SpellsSettings> = {
  name: 'Sorts',
  category: 'tools',
  description: 'A vide la corbeille, Z ferme les apps gourmandes, E « Ne pas déranger », R éteint.',
  icon: LightningIcon,
  size: { w: 5, h: 2, minW: 3, minH: 2 },
  defaults: {},
  component: Spells
}

export default manifest
