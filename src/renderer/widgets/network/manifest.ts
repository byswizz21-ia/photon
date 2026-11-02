// Widget « Réseau » : débit descendant / montant de toutes les interfaces, relu chaque seconde.
import WifiHighIcon from 'phosphor-svelte/lib/WifiHighIcon'
import type { WidgetManifest } from '../types'
import Network from './Network.svelte'

export type NetworkSettings = Record<string, never>

const manifest: WidgetManifest<NetworkSettings> = {
  name: 'Réseau',
  category: 'system',
  description: 'Débit descendant et montant en direct.',
  icon: WifiHighIcon,
  size: { w: 3, h: 2, minW: 2, minH: 1 },
  defaults: {},
  component: Network
}

export default manifest
