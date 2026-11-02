// Widget « Pause des yeux » : rappel régulier (règle 20-20-20 : toutes les 20 min, regarder à
// 6 m pendant 20 s). Le rappel est tenu par Photon (src/main/eyes.ts), réglé par ce widget.
import EyeIcon from 'phosphor-svelte/lib/EyeIcon'
import type { WidgetManifest } from '../types'
import Eyes from './Eyes.svelte'

export type EyesSettings = { on: boolean; minutes: number }

const manifest: WidgetManifest<EyesSettings> = {
  name: 'Pause des yeux',
  icon: EyeIcon,
  size: { w: 3, h: 2, minW: 1, minH: 1 },
  defaults: { on: false, minutes: 20 },
  component: Eyes
}

export default manifest
