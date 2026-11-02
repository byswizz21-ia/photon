// Spotify : l'app Spotify de Windows pilotée depuis Photon (Spotify web ne lit rien dans Electron).
// Options : design « Sobre » ou « Adapté », notification au changement de morceau, accent de
// l'app pris sur la pochette.
import SpotifyLogoIcon from 'phosphor-svelte/lib/SpotifyLogoIcon'
import { MUSIC_DEFAULTS, musicMinSize, type MusicSettings } from '../../lib/MusicPlayer.svelte'
import type { WidgetManifest } from '../types'
import Spotify from './Spotify.svelte'

const manifest: WidgetManifest<MusicSettings> = {
  name: 'Spotify',
  category: 'media',
  description: "Pilote l'app Spotify : pochette, morceau, lecture.",
  icon: SpotifyLogoIcon,
  size: { w: 4, h: 2, minW: 2, minH: 2 },
  defaults: MUSIC_DEFAULTS,
  minSize: musicMinSize,
  component: Spotify
}

export default manifest
