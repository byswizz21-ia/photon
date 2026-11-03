// Widget « Matchs » : en direct, prochains matchs et derniers résultats. Foot (une ligue ou une
// équipe), League of Legends ou Valorant (filtre par équipe ou compétition). Lu en fond par
// Photon (src/main/matches.ts).
import TrophyIcon from 'phosphor-svelte/lib/TrophyIcon'
import type { MatchSport } from '../../../shared/api'
import type { WidgetManifest } from '../types'
import Matches from './Matches.svelte'

export type MatchesSettings = {
  sport: MatchSport
  league: string // foot : ligue ESPN (« fra.1 »)
  team: string // foot : identifiant ESPN de l'équipe ; '' : toute la ligue
  teamName: string
  filter: string // e-sport : équipes ou compétitions, séparées par des virgules ; '' : tout
}

// Ligues de foot proposées (identifiants ESPN).
export const LEAGUES: [string, string][] = [
  ['fra.1', 'Ligue 1'],
  ['fra.2', 'Ligue 2'],
  ['uefa.champions', 'Ligue des champions'],
  ['uefa.europa', 'Ligue Europa'],
  ['eng.1', 'Premier League'],
  ['esp.1', 'LaLiga'],
  ['ita.1', 'Serie A'],
  ['ger.1', 'Bundesliga'],
  ['fifa.world', 'Coupe du monde']
]

const manifest: WidgetManifest<MatchesSettings> = {
  name: 'Matchs',
  category: 'info',
  description: 'Matchs en direct, à venir et résultats : foot, League of Legends, Valorant.',
  icon: TrophyIcon,
  size: { w: 4, h: 3, minW: 3, minH: 2 },
  defaults: { sport: 'foot', league: 'fra.1', team: '', teamName: '', filter: '' },
  component: Matches
}

export default manifest
