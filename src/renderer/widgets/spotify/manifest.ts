// Spotify : l'app Spotify de Windows pilotée depuis Photon (Spotify web ne lit rien dans Electron).
import SpotifyLogoIcon from 'phosphor-svelte/lib/SpotifyLogoIcon'
import type { WidgetManifest } from '../types'
import Spotify from './Spotify.svelte'

export type MusicSettings = Record<string, never>

const manifest: WidgetManifest<MusicSettings> = {
  name: 'Spotify',
  icon: SpotifyLogoIcon,
  size: { w: 4, h: 2, minW: 2, minH: 2 },
  defaults: {},
  component: Spotify
}

export default manifest
