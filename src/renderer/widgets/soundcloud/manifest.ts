// SoundCloud : lecteur caché piloté depuis Photon (compte facultatif, via « Se connecter »).
// Options : notification au changement de morceau, accent de l'app pris sur la pochette.
import SoundcloudLogoIcon from 'phosphor-svelte/lib/SoundcloudLogoIcon'
import type { MusicSettings } from '../../lib/MusicPlayer.svelte'
import type { WidgetManifest } from '../types'
import SoundCloud from './SoundCloud.svelte'

const manifest: WidgetManifest<MusicSettings> = {
  name: 'SoundCloud',
  icon: SoundcloudLogoIcon,
  size: { w: 4, h: 2, minW: 2, minH: 2 },
  defaults: { notify: false, accent: false },
  component: SoundCloud
}

export default manifest
