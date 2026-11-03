// Ce que le widget Échecs garde entre deux ouvertures (data/chess.json, commun aux profils) :
// série du problème du jour, problèmes d'entraînement réussis, parties en cours.
import type { Level } from './engine'

const UCI = /^[a-h][1-8][a-h][1-8][qrbn]?$/

export interface ChessSaved {
  streak: number // jours d'affilée avec le problème du jour réussi
  solvedDay: string // « 2026-11-03 » : dernier problème du jour réussi
  solvedId: string // son identifiant Lichess
  trained: number // problèmes d'entraînement réussis
  bot: { moves: string[]; color: 'w' | 'b' } // partie contre l'ordi, coups depuis le départ
  duo: { moves: string[] }
}

const moves = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((m): m is string => typeof m === 'string' && UCI.test(m)) : []
const count = (v: unknown): number => (typeof v === 'number' && v >= 0 ? Math.floor(v) : 0)
const text = (v: unknown): string => (typeof v === 'string' ? v : '')

export function parseSaved(raw: unknown): ChessSaved {
  const r = (raw ?? {}) as Record<string, Record<string, unknown> | undefined>
  return {
    streak: count(r['streak']),
    solvedDay: text(r['solvedDay']),
    solvedId: text(r['solvedId']),
    trained: count(r['trained']),
    bot: { moves: moves(r['bot']?.['moves']), color: r['bot']?.['color'] === 'b' ? 'b' : 'w' },
    duo: { moves: moves(r['duo']?.['moves']) }
  }
}

// Série après une réussite aujourd'hui : +1 si hier aussi, sinon on repart à 1.
export function nextStreak(saved: ChessSaved, today: string, yesterday: string): number {
  if (saved.solvedDay === today) return saved.streak
  return saved.solvedDay === yesterday ? saved.streak + 1 : 1
}

// Série affichée : cassée si ni aujourd'hui ni hier.
export const liveStreak = (saved: ChessSaved, today: string, yesterday: string): number =>
  saved.solvedDay === today || saved.solvedDay === yesterday ? saved.streak : 0

export const LEVELS: Record<Level, string> = { 1: 'Facile', 2: 'Moyen', 3: 'Difficile' }

// Thèmes Lichess parlants, en français ; les autres (longueur, phase de jeu…) ne sont pas montrés.
const THEMES: Record<string, string> = {
  mateIn1: 'Mat en 1',
  mateIn2: 'Mat en 2',
  mateIn3: 'Mat en 3',
  mateIn4: 'Mat en 4',
  mateIn5: 'Mat en 5+',
  fork: 'Fourchette',
  pin: 'Clouage',
  skewer: 'Enfilade',
  sacrifice: 'Sacrifice',
  discoveredAttack: 'Attaque à la découverte',
  doubleCheck: 'Échec double',
  hangingPiece: 'Pièce en prise',
  trappedPiece: 'Pièce piégée',
  deflection: 'Déviation',
  attraction: 'Attraction',
  clearance: 'Dégagement',
  interference: 'Interception',
  intermezzo: 'Coup intermédiaire',
  quietMove: 'Coup calme',
  xRayAttack: 'Rayon X',
  zugzwang: 'Zugzwang',
  backRankMate: 'Mat du couloir',
  smotheredMate: 'Mat à l’étouffée',
  promotion: 'Promotion',
  underPromotion: 'Sous-promotion',
  enPassant: 'Prise en passant',
  capturingDefender: 'Élimination du défenseur',
  exposedKing: 'Roi exposé',
  defensiveMove: 'Coup défensif',
  endgame: 'Finale'
}

export const themeLabels = (themes: string[]): string[] =>
  themes.flatMap((t) => THEMES[t] ?? []).slice(0, 2)
