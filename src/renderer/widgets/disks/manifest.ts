// Widget « Disques » : espace libre des lecteurs, le premier en vedette. Designs : classique et
// « Exécution » (thème Urgot : barre de vie, rouge sous le seuil d'espace libre).
import HardDrivesIcon from 'phosphor-svelte/lib/HardDrivesIcon'
import { cardPx } from '../../lib/DesignPicker.svelte'
import type { WidgetManifest } from '../types'
import Disks from './Disks.svelte'

// Lettres des lecteurs affichés (« C: »). Vide = tous les lecteurs présents.
// threshold : seuil d'exécution en % d'espace libre (design « Exécution »).
export type DisksSettings = { drives: string[]; design: string; threshold: number }

export const DISK_DESIGNS = [
  ['classic', 'Classique'],
  ['execute', 'Exécution']
] as const

const manifest: WidgetManifest<DisksSettings> = {
  name: 'Disques',
  category: 'system',
  description: 'Espace libre de chaque disque.',
  icon: HardDrivesIcon,
  size: { w: 3, h: 2, minW: 2, minH: 1 },
  defaults: { drives: [], design: 'classic', threshold: 25 },
  minSize: ({ design }) => (design === 'execute' ? cardPx(4, 2) : null),
  component: Disks
}

export default manifest
