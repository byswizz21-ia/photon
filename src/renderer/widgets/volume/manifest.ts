// Widget « Son » : volume de Windows, muet, et choix de la sortie audio (casque, enceintes…).
// Designs : classique, « Molette » (arc à tourner), « Mélangeur » (volume par app).
import SpeakerHighIcon from 'phosphor-svelte/lib/SpeakerHighIcon'
import { cardPx } from '../../lib/DesignPicker.svelte'
import type { WidgetManifest } from '../types'
import Volume from './Volume.svelte'

export type VolumeSettings = { design: string }

export const VOLUME_DESIGNS = [
  ['classic', 'Classique'],
  ['knob', 'Molette'],
  ['mixer', 'Mélangeur']
] as const

const manifest: WidgetManifest<VolumeSettings> = {
  name: 'Son',
  category: 'media',
  description: 'Volume de Windows, muet et choix de la sortie audio.',
  icon: SpeakerHighIcon,
  size: { w: 3, h: 3, minW: 2, minH: 1 },
  defaults: { design: 'classic' },
  minSize: ({ design }) =>
    design === 'knob' ? cardPx(3, 3) : design === 'mixer' ? cardPx(6, 3) : null,
  component: Volume
}

export default manifest
