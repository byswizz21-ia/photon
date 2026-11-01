// Widget « Batteries » : appareils sans fil reconnus (src/main/batteries.cs), relus toutes les
// 30 s fenêtre visible. Pris en charge : SteelSeries Arctis 7+.
import BatteryHighIcon from 'phosphor-svelte/lib/BatteryHighIcon'
import type { WidgetManifest } from '../types'
import Batteries from './Batteries.svelte'

export type BatteriesSettings = Record<string, never>

const manifest: WidgetManifest<BatteriesSettings> = {
  name: 'Batteries',
  icon: BatteryHighIcon,
  size: { w: 3, h: 2, minW: 2, minH: 1 },
  defaults: {},
  component: Batteries
}

export default manifest
