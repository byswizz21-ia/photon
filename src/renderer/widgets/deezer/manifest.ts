// Deezer : lecteur caché piloté depuis Photon (connexion Deezer une fois, via « Se connecter »).
// Options : notification au changement de morceau, accent de l'app pris sur la pochette.
import WaveformIcon from 'phosphor-svelte/lib/WaveformIcon'
import type { MusicSettings } from '../../lib/MusicPlayer.svelte'
import type { WidgetManifest } from '../types'
import Deezer from './Deezer.svelte'

const manifest: WidgetManifest<MusicSettings> = {
  name: 'Deezer',
  icon: WaveformIcon,
  size: { w: 4, h: 2, minW: 2, minH: 2 },
  defaults: { notify: false, accent: false },
  component: Deezer
}

export default manifest
