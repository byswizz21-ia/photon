// SoundCloud : lecteur caché piloté depuis Photon (compte facultatif, via « Se connecter »).
// Options : design « Sobre » ou « Adapté », notification au changement de morceau, accent de
// l'app pris sur la pochette.
import SoundcloudLogoIcon from 'phosphor-svelte/lib/SoundcloudLogoIcon'
import { MUSIC_DEFAULTS, musicMinSize, type MusicSettings } from '../../lib/MusicPlayer.svelte'
import type { WidgetManifest } from '../types'
import SoundCloud from './SoundCloud.svelte'

const manifest: WidgetManifest<MusicSettings> = {
  name: 'SoundCloud',
  category: 'media',
  description: 'Écoute SoundCloud sans ouvrir de fenêtre.',
  icon: SoundcloudLogoIcon,
  size: { w: 4, h: 2, minW: 2, minH: 2 },
  defaults: MUSIC_DEFAULTS,
  minSize: musicMinSize,
  component: SoundCloud
}

export default manifest
