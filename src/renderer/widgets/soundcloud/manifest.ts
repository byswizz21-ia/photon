// SoundCloud : lecteur caché piloté depuis Photon (compte facultatif, via « Se connecter »).
import SoundcloudLogoIcon from 'phosphor-svelte/lib/SoundcloudLogoIcon'
import type { WidgetManifest } from '../types'
import SoundCloud from './SoundCloud.svelte'

export type MusicSettings = Record<string, never>

const manifest: WidgetManifest<MusicSettings> = {
  name: 'SoundCloud',
  icon: SoundcloudLogoIcon,
  size: { w: 4, h: 2, minW: 2, minH: 2 },
  defaults: {},
  component: SoundCloud
}

export default manifest
