// Widget « Ports » : quels programmes écoutent sur quels ports (« port 5173 déjà utilisé »), et
// fermer celui qui gêne. Lu par Photon (src/main/ports.ts), seulement fenêtre visible.
import PlugsConnectedIcon from 'phosphor-svelte/lib/PlugsConnectedIcon'
import type { WidgetManifest } from '../types'
import Ports from './Ports.svelte'

export type PortsSettings = { all: boolean } // false : seulement les programmes fermables

const manifest: WidgetManifest<PortsSettings> = {
  name: 'Ports',
  icon: PlugsConnectedIcon,
  size: { w: 4, h: 3, minW: 3, minH: 2 },
  defaults: { all: false },
  component: Ports
}

export default manifest
