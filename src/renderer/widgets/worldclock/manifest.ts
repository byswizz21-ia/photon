// Widget « Fuseaux horaires » : l'heure de plusieurs villes, le décalage avec ici, la nuit là-bas.
import GlobeHemisphereWestIcon from 'phosphor-svelte/lib/GlobeHemisphereWestIcon'
import type { WidgetManifest } from '../types'
import WorldClock from './WorldClock.svelte'
import type { Zone } from './zones'

export type WorldClockSettings = { zones: Zone[] }

const manifest: WidgetManifest<WorldClockSettings> = {
  name: 'Fuseaux horaires',
  icon: GlobeHemisphereWestIcon,
  size: { w: 3, h: 3, minW: 2, minH: 1 },
  defaults: {
    zones: [
      { tz: 'America/New_York', label: 'New York' },
      { tz: 'Asia/Tokyo', label: 'Tokyo' }
    ]
  },
  component: WorldClock
}

export default manifest
