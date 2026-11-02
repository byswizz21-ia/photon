// Deezer : lecteur caché piloté depuis Photon (connexion Deezer une fois, via « Se connecter »).
import WaveformIcon from 'phosphor-svelte/lib/WaveformIcon'
import type { WidgetManifest } from '../types'
import Deezer from './Deezer.svelte'

export type MusicSettings = Record<string, never>

const manifest: WidgetManifest<MusicSettings> = {
  name: 'Deezer',
  icon: WaveformIcon,
  size: { w: 4, h: 2, minW: 2, minH: 2 },
  defaults: {},
  component: Deezer
}

export default manifest
