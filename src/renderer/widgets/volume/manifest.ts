// Widget « Son » : volume de Windows, muet, et choix de la sortie audio (casque, enceintes…).
import SpeakerHighIcon from 'phosphor-svelte/lib/SpeakerHighIcon'
import type { WidgetManifest } from '../types'
import Volume from './Volume.svelte'

export type VolumeSettings = Record<string, never>

const manifest: WidgetManifest<VolumeSettings> = {
  name: 'Son',
  category: 'media',
  description: 'Volume de Windows, muet et choix de la sortie audio.',
  icon: SpeakerHighIcon,
  size: { w: 3, h: 3, minW: 2, minH: 1 },
  defaults: {},
  component: Volume
}

export default manifest
