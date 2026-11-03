import { describe, expect, it } from 'vitest'
import {
  addAttempt,
  addDeck,
  calibration,
  dueCards,
  level,
  overconfidence,
  parseBrain,
  removeDeck,
  xp
} from './data'
import { review } from './fsrs'
import { cardsTask, sessionTask } from './tasks'

describe('données du Cerveau', () => {
  it('premier lancement : paquet de départ ; fichier abîmé : relu sans planter', () => {
    const first = parseBrain(null)
    expect(first.decks[0]?.name).toBe('Apprendre à apprendre')
    expect(first.cards.length).toBe(8)
    const odd = parseBrain({
      decks: [{ id: 'd' }],
      cards: [{ id: 'x', deck: 'd', q: 'Q', a: '' }],
      extra: 1
    })
    expect(odd.cards).toEqual([]) // carte sans réponse écartée
    expect(odd.extra).toBe(1) // champ inconnu gardé
    expect(odd.session).toBeNull()
  })

  it('cartes orphelines écartées, suppression de paquet en cascade', () => {
    const data = parseBrain({
      decks: [],
      cards: [],
      reviews: {},
      attempts: [],
      bets: [],
      goals: []
    })
    const id = addDeck(data, 'Rust', [{ q: 'Ownership ?', a: 'Un seul propriétaire.' }])
    expect(parseBrain({ ...data, decks: [] }).cards).toEqual([])
    removeDeck(data, id)
    expect(data.cards).toEqual([])
  })

  it('à revoir : échues d’abord, neuves ensuite', () => {
    const now = Date.now()
    const data = parseBrain(null)
    const seen = data.cards[0]!
    Object.assign(seen, review(seen, 3, now - 10 * 86_400_000))
    const due = dueCards(data, now)
    expect(due[0]?.id).toBe(seen.id)
    expect(due).toHaveLength(8)
  })

  it('XP, niveau et calibration', () => {
    const data = parseBrain(null)
    addAttempt(data, 'problem', 100, new Date())
    expect(xp(data)).toBe(40)
    expect(level(0)).toEqual({ level: 1, progress: 0 })
    expect(level(200).level).toBe(3)
    const bets = [90, 90, 90, 90, 90].map((confidence, i) => ({ confidence, correct: i < 2 }))
    expect(calibration(bets).find((c) => c.confidence === 90)?.hit).toBe(40)
    expect(overconfidence(bets)).toBe(50)
  })
})

describe('relecture des réponses de Claude', () => {
  it('cartes : bornées, vides écartées', () => {
    const task = cardsTask('x', 2)
    expect(
      task.parse({
        title: '',
        cards: [
          { q: 'Q', a: 'R' },
          { q: '', a: 'R' }
        ]
      })
    ).toEqual({
      title: 'Nouveau paquet',
      cards: [{ q: 'Q', a: 'R' }]
    })
    expect(task.parse({ cards: [] })).toBeNull()
  })

  it('séance : refuse une question à la réponse hors limites', () => {
    const mcq = { q: 'Q', options: ['a', 'b', 'c', 'd'], answer: 1, why: '' }
    const value = {
      problem: { kind: '', title: 'T', statement: 'S', hint: 'H', solution: 'Sol' },
      calibration: [mcq, mcq, mcq],
      bias: { ...mcq, scenario: 'Histoire' },
      concept: { name: 'Entropie', why: '' }
    }
    expect(sessionTask('logic', 3, []).parse(value)?.problem.kind).toBe('logique')
    expect(
      sessionTask('logic', 3, []).parse({ ...value, bias: { ...value.bias, answer: 7 } })
    ).toBeNull()
  })
})
