import { Chess } from 'chess.js'
import { expect, test } from 'vitest'
import { bestMove } from './engine'

const legal = (fen: string): string[] =>
  new Chess(fen).moves({ verbose: true }).map((m) => m.from + m.to + (m.promotion ?? ''))

test('mat en 1 trouvé (Moyen et Difficile)', () => {
  const fen = 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4'
  expect(bestMove(fen, 2)).toBe('h5f7')
  expect(bestMove(fen, 3)).toBe('h5f7')
})

test('dame offerte prise, pas de dame donnée', () => {
  expect(bestMove('4k3/8/8/3q4/8/8/3R4/4K3 w - - 0 1', 2)).toBe('d2d5')
  // Noirs : prendre la tour défendue par le pion c2 coûterait la dame.
  expect(bestMove('4k3/8/8/3q4/8/3R4/2P5/4K3 b - - 0 1', 2)).not.toBe('d5d3')
})

test('mat en 2 (Difficile)', () => {
  // 1. Dd8+ Txd8 2. Txd8#
  expect(bestMove('3r2k1/5ppp/8/8/8/8/3Q1PPP/3R2K1 w - - 0 1', 3)).toBe('d2d8')
})

test('Facile : toujours un coup légal ; partie finie : aucun', () => {
  const start = new Chess().fen()
  for (const r of [0, 0.1, 0.5, 0.99])
    expect(legal(start)).toContain(bestMove(start, 1, [], () => r))
  expect(bestMove('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3', 3)).toBeNull()
})

test('promotion notée en UCI', () => {
  expect(bestMove('1r5k/P7/8/8/8/8/8/K7 w - - 0 1', 2)).toBe('a7b8q')
})

test('roi + dame contre roi : mat sans tourner en rond (Moyen)', () => {
  const game = new Chess('8/8/8/4k3/8/8/8/3QK3 w - - 0 1')
  const moves: string[] = []
  while (!game.isGameOver() && moves.length < 80) {
    const m = bestMove('8/8/8/4k3/8/8/8/3QK3 w - - 0 1', 2, moves)!
    game.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] })
    moves.push(m)
  }
  expect(game.isCheckmate()).toBe(true)
}, 30_000)
