// Widget « Disques » : espace libre des lecteurs, le premier en vedette.
import HardDrivesIcon from 'phosphor-svelte/lib/HardDrivesIcon'
import type { WidgetManifest } from '../types'
import Disks from './Disks.svelte'

// Lettres des lecteurs affichés (« C: »). Vide = tous les lecteurs présents.
export type DisksSettings = { drives: string[] }

const manifest: WidgetManifest<DisksSettings> = {
  name: 'Disques',
  icon: HardDrivesIcon,
  size: { w: 3, h: 2, minW: 2, minH: 1 },
  defaults: { drives: [] },
  component: Disks
}

export default manifest
