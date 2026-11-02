// Widget « Minuteur d'arrêt » : éteindre, redémarrer ou mettre en veille le PC dans N minutes
// (film le soir, téléchargement). Le minuteur est tenu par Photon (src/main/shutdown.ts).
import PowerIcon from 'phosphor-svelte/lib/PowerIcon'
import type { ShutdownAction } from '../../../shared/api'
import type { WidgetManifest } from '../types'
import Shutdown from './Shutdown.svelte'

export type ShutdownSettings = { action: ShutdownAction; minutes: number }

const manifest: WidgetManifest<ShutdownSettings> = {
  name: "Minuteur d'arrêt",
  icon: PowerIcon,
  size: { w: 3, h: 3, minW: 2, minH: 2 },
  defaults: { action: 'shutdown', minutes: 60 },
  component: Shutdown
}

export default manifest
