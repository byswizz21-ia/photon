// Horloge : heure 24 h en grand (les chiffres défilent) et date du jour.
import ClockIcon from 'phosphor-svelte/lib/ClockIcon'
import type { WidgetManifest } from '../types'
import Clock from './Clock.svelte'

export type ClockSettings = { seconds: boolean }

const manifest: WidgetManifest<ClockSettings> = {
  name: 'Horloge',
  icon: ClockIcon,
  size: { w: 6, h: 2, minW: 1, minH: 1 },
  defaults: { seconds: false },
  component: Clock
}

export default manifest
