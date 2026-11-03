// Widget « Bus et tram » : prochains passages en temps réel à un arrêt, dans chaque direction.
// Réseau Divia (Dijon) pour commencer ; lu en fond par Photon (src/main/transit.ts).
import BusIcon from 'phosphor-svelte/lib/BusIcon'
import type { WidgetManifest } from '../types'
import Transit from './Transit.svelte'

export type TransitSettings = {
  line: string // identifiant Navitia (« line:CGD:L3 ») ; '' : pas encore choisi
  lineCode: string // « L3 », gardé pour l'afficher sans réseau
  lineColor: string // « EA619F »
  stop: string // identifiant Navitia de l'arrêt
  stopName: string
}

const manifest: WidgetManifest<TransitSettings> = {
  name: 'Bus et tram',
  category: 'info',
  description: 'Prochains passages en temps réel à ton arrêt (Divia, Dijon).',
  icon: BusIcon,
  size: { w: 3, h: 2, minW: 2, minH: 2 },
  defaults: { line: '', lineCode: '', lineColor: '', stop: '', stopName: '' },
  component: Transit
}

export default manifest
