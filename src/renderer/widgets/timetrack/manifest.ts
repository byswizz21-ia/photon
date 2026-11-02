// Widget « Suivi du temps » : un chrono par client ou projet, totaux du jour et de la semaine.
// Données partagées entre profils (data/timetrack.json) : le chrono continue Photon fermé.
import HourglassIcon from 'phosphor-svelte/lib/HourglassIcon'
import type { WidgetManifest } from '../types'
import Timetrack from './Timetrack.svelte'

export type TimetrackSettings = Record<string, never>

const manifest: WidgetManifest<TimetrackSettings> = {
  name: 'Suivi du temps',
  category: 'time',
  description: 'Un chrono par client ou projet, totaux du jour et de la semaine.',
  icon: HourglassIcon,
  size: { w: 3, h: 3, minW: 2, minH: 2 },
  defaults: {},
  component: Timetrack
}

export default manifest
