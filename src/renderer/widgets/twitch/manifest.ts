// Widget « Twitch » : qui est en live parmi les chaînes suivies (compte connecté) et celles
// ajoutées à la main, lu en fond par Photon (src/main/twitch.ts). Clic : le live dans le navigateur.
import TwitchLogoIcon from 'phosphor-svelte/lib/TwitchLogoIcon'
import type { WidgetManifest } from '../types'
import Twitch from './Twitch.svelte'

export type TwitchSettings = { channels: string } // pseudos en plus des suivis, séparés par des virgules

const manifest: WidgetManifest<TwitchSettings> = {
  name: 'Twitch',
  category: 'media',
  description: 'Les streamers que tu suis qui sont en live.',
  icon: TwitchLogoIcon,
  size: { w: 4, h: 3, minW: 2, minH: 2 },
  defaults: { channels: '' },
  component: Twitch
}

export default manifest
