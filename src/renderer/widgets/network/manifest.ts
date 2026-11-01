// Widget « Réseau » : débit descendant / montant de toutes les interfaces, relu chaque seconde.
import WifiHighIcon from 'phosphor-svelte/lib/WifiHighIcon'
import type { WidgetManifest } from '../types'
import Network from './Network.svelte'

export type NetworkSettings = Record<string, never>

const manifest: WidgetManifest<NetworkSettings> = {
  name: 'Réseau',
  icon: WifiHighIcon,
  size: { w: 3, h: 2, minW: 2, minH: 2 },
  defaults: {},
  component: Network
}

export default manifest
