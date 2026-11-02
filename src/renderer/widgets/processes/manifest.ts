// Widget « Processus » : les programmes les plus gourmands en CPU ou en RAM, avec un bouton fermer.
import GaugeIcon from 'phosphor-svelte/lib/GaugeIcon'
import type { WidgetManifest } from '../types'
import Processes from './Processes.svelte'

export type ProcessesSettings = { sort: 'cpu' | 'ram' }

const manifest: WidgetManifest<ProcessesSettings> = {
  name: 'Processus',
  icon: GaugeIcon,
  size: { w: 4, h: 3, minW: 2, minH: 2 },
  defaults: { sort: 'cpu' },
  component: Processes
}

export default manifest
