// Widget « Échecs » : problème du jour et entraînement (Lichess, lus en fond par Photon,
// src/main/chess.ts), partie contre l'ordi (engine.ts, 3 niveaux) ou à deux sur le même écran.
import HorseIcon from 'phosphor-svelte/lib/HorseIcon'
import type { WidgetManifest } from '../types'
import Chess from './Chess.svelte'

export type ChessMode = 'daily' | 'train' | 'bot' | 'duo'

export type ChessSettings = {
  mode: ChessMode
  level: 1 | 2 | 3 // contre l'ordi : Facile, Moyen, Difficile
  color: 'w' | 'b' | 'random' // ta couleur à la prochaine partie contre l'ordi
}

const manifest: WidgetManifest<ChessSettings> = {
  name: 'Échecs',
  category: 'games',
  description: 'Problème du jour, entraînement, partie contre l’ordi ou à deux.',
  icon: HorseIcon,
  size: { w: 4, h: 5, minW: 3, minH: 4 },
  defaults: { mode: 'daily', level: 2, color: 'w' },
  component: Chess
}

export default manifest
