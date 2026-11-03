// Widget « Corbeille » : taille de la corbeille de tous les disques, la vider, l'ouvrir.
import TrashIcon from 'phosphor-svelte/lib/TrashIcon'
import type { WidgetManifest } from '../types'
import Trash from './Trash.svelte'

export type TrashSettings = Record<string, never>

const manifest: WidgetManifest<TrashSettings> = {
  name: 'Corbeille',
  category: 'system',
  description: 'Taille de la corbeille, et la vider en un clic.',
  icon: TrashIcon,
  size: { w: 2, h: 2, minW: 2, minH: 1 },
  defaults: {},
  component: Trash
}

export default manifest
