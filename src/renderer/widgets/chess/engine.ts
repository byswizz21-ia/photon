// Bot d'échecs : recherche alpha-bêta + quiescence (prises jusqu'au calme), évaluation matériel +
// tables de placement (« Simplified Evaluation Function », T. Michniewski). Tourne dans
// bot.worker.ts pour ne pas figer l'interface. Coups en UCI (« e2e4 », « e7e8q »).
import { Chess } from 'chess.js'

export type Level = 1 | 2 | 3

type Color = 'w' | 'b'
type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k'
type RawMove = {
  from: number
  to: number
  piece: PieceType
  captured?: PieceType
  promotion?: PieceType
}

// ponytail: API interne de chess.js (celle de son perft), 100× plus rapide que moves()/move()
// publics. Version figée dans package.json ; engine.test.ts casse si une mise à jour la change.
interface Internals {
  _board: ({ type: PieceType; color: Color } | undefined)[] // 0x88 : a8 = 0, h1 = 119
  _turn: Color
  _hash: bigint
  _moves(options: { legal: boolean }): RawMove[]
  _makeMove(move: RawMove): void
  _undoMove(): unknown
  _isKingAttacked(color: Color): boolean
  // Positions vues : celles de la partie (move() public) et du chemin de recherche (play/back).
  _getPositionCount(hash: bigint): number
  _incPositionCount(): void
  _decPositionCount(hash: bigint): void
}

// Niveau → profondeur max et temps de réflexion. Facile : 1 coup d'avance, avec du hasard.
const LEVELS: Record<Level, { depth: number; ms: number }> = {
  1: { depth: 1, ms: 300 },
  2: { depth: 4, ms: 600 },
  3: { depth: 6, ms: 1500 }
}

const MATE = 100_000
const VALUE: Record<PieceType, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 }

// Tables vues des Blancs, ligne 8 d'abord (index = rangée 0x88 × 8 + colonne).
// prettier-ignore
const PST: Record<PieceType | 'kEnd', number[]> = {
  p: [0,0,0,0,0,0,0,0, 50,50,50,50,50,50,50,50, 10,10,20,30,30,20,10,10, 5,5,10,25,25,10,5,5,
    0,0,0,20,20,0,0,0, 5,-5,-10,0,0,-10,-5,5, 5,10,10,-20,-20,10,10,5, 0,0,0,0,0,0,0,0],
  n: [-50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,0,0,0,-20,-40, -30,0,10,15,15,10,0,-30,
    -30,5,15,20,20,15,5,-30, -30,0,15,20,20,15,0,-30, -30,5,10,15,15,10,5,-30,
    -40,-20,0,5,5,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50],
  b: [-20,-10,-10,-10,-10,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,10,10,5,0,-10,
    -10,5,5,10,10,5,5,-10, -10,0,10,10,10,10,0,-10, -10,10,10,10,10,10,10,-10,
    -10,5,0,0,0,0,5,-10, -20,-10,-10,-10,-10,-10,-10,-20],
  r: [0,0,0,0,0,0,0,0, 5,10,10,10,10,10,10,5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5,
    -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, 0,0,0,5,5,0,0,0],
  q: [-20,-10,-10,-5,-5,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,5,5,5,0,-10, -5,0,5,5,5,5,0,-5,
    0,0,5,5,5,5,0,-5, -10,5,5,5,5,5,0,-10, -10,0,5,0,0,0,0,-10, -20,-10,-10,-5,-5,-10,-10,-20],
  k: [-30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30, -20,-30,-30,-40,-40,-30,-30,-20, -10,-20,-20,-20,-20,-20,-20,-10,
    20,20,0,0,0,0,20,20, 20,30,10,0,0,10,30,20],
  kEnd: [-50,-40,-30,-20,-20,-30,-40,-50, -30,-20,-10,0,0,-10,-20,-30, -30,-10,20,30,30,20,-10,-30,
    -30,-10,30,40,40,30,-10,-30, -30,-10,30,40,40,30,-10,-30, -30,-10,20,30,30,20,-10,-30,
    -30,-30,0,0,0,0,-30,-30, -50,-30,-30,-30,-30,-30,-30,-50]
}

const square = (i: number): string => 'abcdefgh'[i & 15]! + (8 - (i >> 4))
const uci = (m: RawMove): string => square(m.from) + square(m.to) + (m.promotion ?? '')
const center = (i: number): number => Math.abs(3.5 - (i & 15)) + Math.abs(3.5 - (i >> 4)) // 1 à 7

// Score du point de vue du camp au trait. Finale (peu de pièces) : le roi monte au centre ; seul
// contre un roi nu, on le pousse au bord et on en rapproche le sien (sinon le mat n'arrive pas).
export function evaluate(c: Internals): number {
  let score = 0
  let heavy = 0
  const kings: Partial<Record<Color, number>> = {}
  const count: Record<Color, number> = { w: 0, b: 0 }
  for (let i = 0; i < 128; i++) {
    const piece = c._board[i]
    if (i & 0x88 || !piece) continue
    count[piece.color]++
    if (piece.type === 'k') kings[piece.color] = i
    else if (piece.type !== 'p') heavy += VALUE[piece.type]
  }
  const end = heavy < 1500
  for (let i = 0; i < 128; i++) {
    const piece = c._board[i]
    if (i & 0x88 || !piece) continue
    const row = piece.color === 'w' ? i >> 4 : 7 - (i >> 4)
    const table = piece.type === 'k' && end ? PST.kEnd : PST[piece.type]
    const value = VALUE[piece.type] + table[row * 8 + (i & 15)]!
    score += piece.color === 'w' ? value : -value
  }
  const { w, b } = kings
  if (end && w !== undefined && b !== undefined) {
    const gap = Math.abs((w & 15) - (b & 15)) + Math.abs((w >> 4) - (b >> 4))
    if (count.b === 1 && count.w > 1) score += 20 * center(b) + 10 * (14 - gap)
    if (count.w === 1 && count.b > 1) score -= 20 * center(w) + 10 * (14 - gap)
  }
  return c._turn === 'w' ? score : -score
}

// Prises d'abord (grosse victime, petit attaquant), promotions ensuite.
const order = (moves: RawMove[]): RawMove[] =>
  moves
    .map((m) => ({
      m,
      s:
        (m.captured ? 10_000 + 10 * VALUE[m.captured] - VALUE[m.piece] : 0) +
        (m.promotion ? 9_000 : 0)
    }))
    .sort((a, b) => b.s - a.s)
    .map(({ m }) => m)

class Timeout extends Error {}

class Search {
  nodes = 0
  constructor(
    readonly c: Internals,
    readonly deadline: number
  ) {}

  tick(): void {
    if ((++this.nodes & 1023) === 0 && Date.now() > this.deadline) throw new Timeout()
  }

  quiesce(alpha: number, beta: number, depth: number): number {
    this.tick()
    const stand = evaluate(this.c)
    if (stand >= beta || depth === 0) return stand
    if (stand > alpha) alpha = stand
    const us = this.c._turn
    for (const m of order(
      this.c._moves({ legal: false }).filter((m) => m.captured || m.promotion)
    )) {
      this.c._makeMove(m)
      if (this.c._isKingAttacked(us)) {
        this.c._undoMove()
        continue
      }
      const score = -this.quiesce(-beta, -alpha, depth - 1)
      this.c._undoMove()
      if (score >= beta) return score
      if (score > alpha) alpha = score
    }
    return alpha
  }

  // Joue un coup s'il est légal et compte la position (répétitions).
  play(m: RawMove): boolean {
    const us = this.c._turn
    this.c._makeMove(m)
    if (this.c._isKingAttacked(us)) {
      this.c._undoMove()
      return false
    }
    this.c._incPositionCount()
    return true
  }

  back(): void {
    this.c._decPositionCount(this.c._hash)
    this.c._undoMove()
  }

  // Score après le coup joué : position déjà vue = nulle (sinon le gagnant tourne en rond).
  after(depth: number, alpha: number, beta: number, ply: number): number {
    if (this.c._getPositionCount(this.c._hash) > 1) return 0
    return -this.negamax(depth, -beta, -alpha, ply)
  }

  // Négamax : score du camp au trait ; mat plus proche = meilleur (ply).
  negamax(depth: number, alpha: number, beta: number, ply: number): number {
    if (depth === 0) return this.quiesce(alpha, beta, 6)
    this.tick()
    let legal = 0
    for (const m of order(this.c._moves({ legal: false }))) {
      if (!this.play(m)) continue
      legal++
      const score = this.after(depth - 1, alpha, beta, ply + 1)
      this.back()
      if (score >= beta) return score
      if (score > alpha) alpha = score
    }
    if (!legal) return this.c._isKingAttacked(this.c._turn) ? -MATE + ply : 0 // mat ou pat
    return alpha
  }

  // Coups de la racine notés, meilleur d'abord. exact : chaque score est juste (niveau Facile,
  // qui en tire au sort parmi les bons) ; sinon les coups moins bons s'arrêtent dès qu'ils le sont.
  rank(moves: RawMove[], depth: number, exact: boolean): { m: RawMove; score: number }[] {
    let alpha = -MATE - 1
    return moves
      .map((m) => {
        this.play(m)
        const score = this.after(depth - 1, alpha, MATE + 1, 1)
        this.back()
        if (!exact && score > alpha) alpha = score
        return { m, score }
      })
      .sort((a, b) => b.score - a.score)
  }
}

// Meilleur coup trouvé dans le temps du niveau, depuis `fen` puis les coups `moves` déjà joués
// (pour les répétitions) ; null : partie finie. `random` pour les tests.
export function bestMove(
  fen: string,
  level: Level,
  moves: string[] = [],
  random = Math.random
): string | null {
  const game = new Chess(fen)
  for (const m of moves) game.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] })
  const c = game as unknown as Internals
  const us = c._turn
  let legal = order(c._moves({ legal: false })).filter((m) => {
    c._makeMove(m)
    const legal = !c._isKingAttacked(us)
    c._undoMove()
    return legal
  })
  if (!legal.length) return null
  const { depth, ms } = LEVELS[level]
  const search = new Search(c, Date.now() + ms)

  if (level === 1) {
    if (random() < 0.15) return uci(legal[Math.floor(random() * legal.length)]!)
    const ranked = search
      .rank(legal, 1, true)
      .map((r) => ({ ...r, score: r.score + random() * 180 }))
    return uci(ranked.sort((a, b) => b.score - a.score)[0]!.m)
  }

  // Approfondissement itératif : le dernier tour fini compte, son meilleur coup passe devant.
  let best = legal[0]!
  for (let d = 1; d <= depth; d++) {
    try {
      const ranked = search.rank(legal, d, false)
      best = ranked[0]!.m
      legal = ranked.map((r) => r.m)
      if (ranked[0]!.score > MATE - 100) break // mat trouvé
    } catch (error) {
      if (error instanceof Timeout) break
      throw error
    }
  }
  return uci(best)
}
