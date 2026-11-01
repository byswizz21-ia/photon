// Widget « Son » : volume de Windows, muet, et choix de la sortie audio (casque, enceintes…).
import SpeakerHighIcon from 'phosphor-svelte/lib/SpeakerHighIcon'
import type { WidgetManifest } from '../types'
import Volume from './Volume.svelte'

export type VolumeSettings = Record<string, never>

const manifest: WidgetManifest<VolumeSettings> = {
  name: 'Son',
  icon: SpeakerHighIcon,
  size: { w: 3, h: 3, minW: 2, minH: 2 },
  defaults: {},
  component: Volume
}

export default manifest
