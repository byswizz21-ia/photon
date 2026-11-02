// Widget « Anti-veille » : garder le PC éveillé (téléchargement, rendu, présentation…) pour une
// durée ou jusqu'à l'arrêt, écran compris au choix. Tenu par Photon (src/main/awake.ts).
import CoffeeIcon from 'phosphor-svelte/lib/CoffeeIcon'
import type { WidgetManifest } from '../types'
import Awake from './Awake.svelte'

export type AwakeSettings = { minutes: number; screen: boolean } // minutes 0 : jusqu'à l'arrêt

const manifest: WidgetManifest<AwakeSettings> = {
  name: 'Anti-veille',
  category: 'tools',
  description: 'Empêche le PC de se mettre en veille pendant un moment.',
  icon: CoffeeIcon,
  size: { w: 3, h: 2, minW: 1, minH: 1 },
  defaults: { minutes: 60, screen: false },
  component: Awake
}

export default manifest
