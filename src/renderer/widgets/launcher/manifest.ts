// Lanceur : une tuile par app (raccourci, exécutable, dossier) ; un clic la lance et cache Photon.
import RocketLaunchIcon from 'phosphor-svelte/lib/RocketLaunchIcon'
import type { WidgetManifest } from '../types'
import Launcher from './Launcher.svelte'

export type LauncherSettings = { apps: string[] } // chemins absolus

const manifest: WidgetManifest<LauncherSettings> = {
  name: 'Lanceur',
  category: 'tools',
  description: 'Des apps en tuiles : un clic les lance.',
  icon: RocketLaunchIcon,
  size: { w: 6, h: 2, minW: 1, minH: 1 },
  defaults: { apps: [] },
  component: Launcher
}

export default manifest
