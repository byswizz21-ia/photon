import { expect, test, vi } from 'vitest'

vi.mock('electron', () => ({ net: {} }))
vi.mock('./data', () => ({ data: { profile: { widgets: [] } } }))
const { parsePuzzle } = await import('./chess')

test('problème Lichess : position, solution UCI, thèmes', () => {
  const json = {
    game: { pgn: 'e4 e5' },
    puzzle: {
      id: 'tmwOv',
      rating: 1769,
      solution: ['f6b2', 'h2h1', 'b2a2'],
      themes: ['middlegame', 'fork'],
      fen: '4r1k1/5ppp/p4q2/1p3P2/5PQ1/P2Rb1BP/BP5K/8 b - - 0 1',
      lastMove: 'd1d3'
    }
  }
  expect(parsePuzzle(json)).toEqual({
    id: 'tmwOv',
    fen: '4r1k1/5ppp/p4q2/1p3P2/5PQ1/P2Rb1BP/BP5K/8 b - - 0 1',
    solution: ['f6b2', 'h2h1', 'b2a2'],
    lastMove: 'd1d3',
    rating: 1769,
    themes: ['middlegame', 'fork']
  })
})

test('problème illisible : refusé', () => {
  expect(parsePuzzle(null)).toBeNull()
  expect(parsePuzzle({ puzzle: { id: 'a', fen: 'x', solution: [] } })).toBeNull()
  expect(parsePuzzle({ puzzle: { id: 'a', fen: 'x', solution: ['e2e4', 'rm -rf'] } })).toBeNull()
})
