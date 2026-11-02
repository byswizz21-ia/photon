// Widget « Presse-papiers » : derniers textes copiés (en mémoire, src/main/clipboard.ts) et
// textes épinglés (gardés sur le disque, partagés entre profils). Un clic recopie.
import ClipboardTextIcon from 'phosphor-svelte/lib/ClipboardTextIcon'
import type { WidgetManifest } from '../types'
import Clipboard from './Clipboard.svelte'

export type ClipboardSettings = Record<string, never>

const manifest: WidgetManifest<ClipboardSettings> = {
  name: 'Presse-papiers',
  category: 'tools',
  description: 'Derniers textes copiés et textes épinglés.',
  icon: ClipboardTextIcon,
  size: { w: 3, h: 4, minW: 2, minH: 1 },
  defaults: {},
  component: Clipboard
}

export default manifest
