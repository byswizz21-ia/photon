// Widget « Jeux gratuits » : jeux offerts en ce moment (et la semaine prochaine sur Epic), lus en
// fond par Photon (src/main/freegames.ts). Clic : la page du jeu dans le navigateur.
import GiftIcon from 'phosphor-svelte/lib/GiftIcon'
import type { WidgetManifest } from '../types'
import FreeGames from './FreeGames.svelte'

export type FreeGamesSettings = { stores: string[] } // boutiques affichées

export const STORES = ['Epic Games', 'Steam', 'GOG']

const manifest: WidgetManifest<FreeGamesSettings> = {
  name: 'Jeux gratuits',
  category: 'info',
  description: 'Jeux offerts cette semaine sur Epic Games, Steam et GOG.',
  icon: GiftIcon,
  size: { w: 4, h: 3, minW: 2, minH: 2 },
  defaults: { stores: STORES },
  component: FreeGames
}

export default manifest
