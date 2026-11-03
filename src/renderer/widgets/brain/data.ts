// Données du widget Cerveau (data/brain.json, partagé entre profils) : paquets de cartes,
// historique d'entraînement, calibration et parcours du coach. Tout est relu et borné ici ;
// les champs inconnus du fichier sont gardés (retour à une version plus ancienne de Photon).
import { dayKey } from '../../../shared/day'
import { fresh, recall, type Memory } from './fsrs'

export interface Card extends Memory {
  id: string
  deck: string
  q: string
  a: string
}

export interface Deck {
  id: string
  name: string
  createdAt: number
}

export type Station = 'problem' | 'calibration' | 'bias' | 'feynman'

export interface Attempt {
  day: string // « 2026-11-03 »
  station: Station
  score: number // 0 à 100
}

// Une réponse de calibration : confiance annoncée (%) et justesse.
export interface Bet {
  confidence: number
  correct: boolean
}

export interface Step {
  title: string
  detail: string
  minutes: number
  done: boolean
  deck: string | null // paquet créé pour cette étape
}

export interface Goal {
  id: string
  title: string // « Apprendre Rust en un mois »
  topic: string
  level: string
  createdAt: number
  pretest: number | null // score du pré-test, %
  steps: Step[]
}

export interface BrainData {
  decks: Deck[]
  cards: Card[]
  reviews: Record<string, number> // révisions par jour
  attempts: Attempt[]
  bets: Bet[]
  goals: Goal[]
  // Séance d'entraînement du jour, relue par Gym (sessionTask) : contenu et réponses données.
  session: { day: string; value: unknown; answers: Record<string, unknown> } | null
  concepts: string[] // notions Feynman déjà proposées (pas de redite)
  [key: string]: unknown
}

export const LIMITS = { decks: 60, cards: 3000, attempts: 1500, bets: 600, goals: 12, days: 800 }
export const TEXT = { q: 400, a: 1200, name: 80, detail: 600 }

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.slice(0, max) : '')
const num = (v: unknown, min: number, max: number, fallback = min): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
const DAY = /^\d{4}-\d{2}-\d{2}$/
const STATIONS: readonly string[] = ['problem', 'calibration', 'bias', 'feynman']

function parseCard(v: unknown): Card | null {
  if (!isObject(v) || typeof v.id !== 'string' || typeof v.deck !== 'string') return null
  const q = str(v.q, TEXT.q).trim()
  const a = str(v.a, TEXT.a).trim()
  if (!q || !a) return null
  return {
    id: v.id,
    deck: v.deck,
    q,
    a,
    stability: num(v.stability, 0, 36500),
    difficulty: num(v.difficulty, 0, 10),
    due: num(v.due, 0, Number.MAX_SAFE_INTEGER),
    last: num(v.last, 0, Number.MAX_SAFE_INTEGER),
    reps: Math.round(num(v.reps, 0, 1e6)),
    lapses: Math.round(num(v.lapses, 0, 1e6))
  }
}

function parseGoal(v: unknown): Goal | null {
  if (!isObject(v) || typeof v.id !== 'string') return null
  const steps = list(v.steps)
    .filter(isObject)
    .slice(0, 12)
    .map((s) => ({
      title: str(s.title, TEXT.name),
      detail: str(s.detail, TEXT.detail),
      minutes: Math.round(num(s.minutes, 5, 600, 30)),
      done: s.done === true,
      deck: typeof s.deck === 'string' ? s.deck : null
    }))
    .filter((s) => s.title)
  return {
    id: v.id,
    title: str(v.title, TEXT.name) || 'Parcours',
    topic: str(v.topic, TEXT.name),
    level: str(v.level, 40),
    createdAt: num(v.createdAt, 0, Number.MAX_SAFE_INTEGER),
    pretest: v.pretest === null ? null : num(v.pretest, 0, 100, 0),
    steps
  }
}

export function parseBrain(raw: unknown): BrainData {
  if (!isObject(raw)) return starter(Date.now())
  const decks = list(raw.decks)
    .filter(isObject)
    .filter((d) => typeof d.id === 'string')
    .slice(0, LIMITS.decks)
    .map((d) => ({
      id: d.id as string,
      name: str(d.name, TEXT.name) || 'Paquet',
      createdAt: num(d.createdAt, 0, Number.MAX_SAFE_INTEGER)
    }))
  const ids = new Set(decks.map((d) => d.id))
  const reviews: Record<string, number> = {}
  if (isObject(raw.reviews)) {
    for (const [day, n] of Object.entries(raw.reviews).sort().slice(-LIMITS.days)) {
      if (DAY.test(day)) reviews[day] = Math.round(num(n, 0, 1e5))
    }
  }
  return {
    ...raw,
    decks,
    cards: list(raw.cards)
      .map(parseCard)
      .filter((c): c is Card => c !== null && ids.has(c.deck))
      .slice(0, LIMITS.cards),
    reviews,
    attempts: list(raw.attempts)
      .filter(isObject)
      .filter(
        (a) => typeof a.day === 'string' && DAY.test(a.day) && STATIONS.includes(String(a.station))
      )
      .map((a) => ({
        day: a.day as string,
        station: a.station as Station,
        score: num(a.score, 0, 100)
      }))
      .slice(-LIMITS.attempts),
    bets: list(raw.bets)
      .filter(isObject)
      .map((b) => ({ confidence: num(b.confidence, 0, 100, 50), correct: b.correct === true }))
      .slice(-LIMITS.bets),
    goals: list(raw.goals)
      .map(parseGoal)
      .filter((g) => g !== null)
      .slice(0, LIMITS.goals),
    session:
      isObject(raw.session) && typeof raw.session.day === 'string'
        ? {
            day: raw.session.day,
            value: raw.session.value,
            answers: isObject(raw.session.answers) ? raw.session.answers : {}
          }
        : null,
    concepts: list(raw.concepts)
      .map((c) => str(c, TEXT.name))
      .filter(Boolean)
      .slice(-60)
  }
}

// --- Paquets et cartes ---

export function addDeck(data: BrainData, name: string, cards: { q: string; a: string }[]): string {
  const id = crypto.randomUUID()
  const now = Date.now()
  data.decks.push({ id, name: name.trim().slice(0, TEXT.name) || 'Paquet', createdAt: now })
  addCards(data, id, cards)
  return id
}

export function addCards(data: BrainData, deck: string, cards: { q: string; a: string }[]): void {
  const now = Date.now()
  const room = LIMITS.cards - data.cards.length
  for (const { q, a } of cards.slice(0, Math.max(0, room))) {
    const card = { id: crypto.randomUUID(), deck, q: q.slice(0, TEXT.q), a: a.slice(0, TEXT.a) }
    if (card.q.trim() && card.a.trim()) data.cards.push({ ...card, ...fresh(now) })
  }
}

export function removeDeck(data: BrainData, id: string): void {
  data.decks = data.decks.filter((d) => d.id !== id)
  data.cards = data.cards.filter((c) => c.deck !== id)
  for (const goal of data.goals)
    for (const step of goal.steps) if (step.deck === id) step.deck = null
}

// Cartes à revoir : échues, les plus en retard d'abord ; les neuves à la fin, 20 par jour au plus.
export const NEW_PER_DAY = 20

export function dueCards(data: BrainData, now: number, deck?: string): Card[] {
  const pool = data.cards.filter((c) => !deck || c.deck === deck)
  const old = pool.filter((c) => c.reps > 0 && c.due <= now).sort((a, b) => a.due - b.due)
  const fresh = pool.filter((c) => c.reps === 0).slice(0, NEW_PER_DAY)
  return [...old, ...fresh]
}

// Mémoire moyenne d'un paquet (0 à 1) sur ses cartes déjà vues ; null : rien de vu.
export function retention(cards: Card[], now: number): number | null {
  const seen = cards.filter((c) => c.reps > 0)
  if (!seen.length) return null
  return seen.reduce((sum, c) => sum + recall(c, now), 0) / seen.length
}

// Un paquet vu sur la carte des connaissances.
export interface Star {
  id: string
  name: string
  count: number
  retention: number | null // 0 à 1
  due: number
}

export function stars(data: BrainData, now: number): Star[] {
  return data.decks.map((deck) => {
    const cards = data.cards.filter((c) => c.deck === deck.id)
    return {
      id: deck.id,
      name: deck.name,
      count: cards.length,
      retention: retention(cards, now),
      due: cards.filter((c) => c.reps > 0 && c.due <= now).length
    }
  })
}

export function countReview(data: BrainData, now: Date): void {
  const day = dayKey(now)
  data.reviews[day] = (data.reviews[day] ?? 0) + 1
}

// --- Entraînement ---

export const XP: Record<Station, number> = { problem: 40, calibration: 25, bias: 15, feynman: 40 }

export function addAttempt(data: BrainData, station: Station, score: number, now: Date): void {
  data.attempts.push({ day: dayKey(now), station, score: Math.round(num(score, 0, 100)) })
  if (data.attempts.length > LIMITS.attempts)
    data.attempts.splice(0, data.attempts.length - LIMITS.attempts)
}

// Expérience : la note pèse sur le gain (un essai raté rapporte un tiers), chaque révision 2 XP.
export function xp(data: BrainData): number {
  const gym = data.attempts.reduce(
    (sum, a) => sum + XP[a.station] * (0.33 + (0.67 * a.score) / 100),
    0
  )
  const reviews = Object.values(data.reviews).reduce((sum, n) => sum + n, 0)
  return Math.round(gym + reviews * 2)
}

// Niveau n atteint à 50·n² XP : rapide au début, puis de plus en plus long.
export function level(points: number): { level: number; progress: number } {
  const n = Math.floor(Math.sqrt(points / 50))
  const from = 50 * n * n
  const to = 50 * (n + 1) * (n + 1)
  return { level: n + 1, progress: (points - from) / (to - from) }
}

// Jours actifs (révision ou entraînement), pour la série.
export const activeDays = (data: BrainData): string[] => [
  ...new Set([
    ...Object.keys(data.reviews).filter((d) => (data.reviews[d] ?? 0) > 0),
    ...data.attempts.map((a) => a.day)
  ])
]

export const doneToday = (data: BrainData, now: Date): Set<Station> =>
  new Set(data.attempts.filter((a) => a.day === dayKey(now)).map((a) => a.station))

// Calibration : pour chaque niveau de confiance annoncé, part de bonnes réponses.
export const CONFIDENCES = [50, 70, 90, 99] as const

export function calibration(bets: Bet[]): { confidence: number; hit: number | null; n: number }[] {
  return CONFIDENCES.map((confidence) => {
    const mine = bets.filter((b) => b.confidence === confidence)
    return {
      confidence,
      n: mine.length,
      hit: mine.length ? (100 * mine.filter((b) => b.correct).length) / mine.length : null
    }
  })
}

// Écart moyen entre confiance et justesse (points de %) : + trop sûr de toi, − trop prudent.
export function overconfidence(bets: Bet[]): number | null {
  if (bets.length < 5) return null
  return bets.reduce((sum, b) => sum + b.confidence - (b.correct ? 100 : 0), 0) / bets.length
}

// --- Premier lancement : un paquet pour apprendre à apprendre ---

const STARTER: { q: string; a: string }[] = [
  {
    q: 'Pourquoi relire un cours marche moins bien que se tester ?',
    a: "Relire donne une impression de familiarité. Se tester force le cerveau à récupérer l'info, et c'est cet effort de récupération qui renforce le souvenir (effet de test)."
  },
  {
    q: 'Qu’est-ce que la répétition espacée ?',
    a: "Revoir une info juste avant de l'oublier, à des intervalles de plus en plus longs. Chaque rappel réussi allonge la durée du souvenir."
  },
  {
    q: 'Qu’est-ce que l’entrelacement (interleaving) ?',
    a: 'Mélanger plusieurs types de problèmes dans une même séance au lieu de les faire en bloc. Plus dur sur le moment, mais on apprend à choisir la bonne méthode.'
  },
  {
    q: 'En quoi consiste la technique de Feynman ?',
    a: "Expliquer un concept avec des mots simples, comme à un enfant de 12 ans. Là où l'explication coince ou devient floue, il y a un trou de compréhension à combler."
  },
  {
    q: 'Pourquoi faire un pré-test avant d’étudier un sujet ?',
    a: "Chercher une réponse qu'on ne connaît pas encore prépare le cerveau : on retient mieux la vraie réponse ensuite, même après s'être trompé."
  },
  {
    q: 'Qu’est-ce que la pratique délibérée ?',
    a: 'Travailler précisément ce qu’on rate, juste au-dessus de son niveau, avec un retour rapide sur chaque essai. Répéter ce qu’on sait déjà faire fait peu progresser.'
  },
  {
    q: 'Qu’est-ce qu’être bien calibré ?',
    a: 'Quand tu te dis sûr à 70 %, tu as raison environ 7 fois sur 10. La plupart des gens sont trop sûrs d’eux ; ça se corrige en mesurant ses paris.'
  },
  {
    q: 'Quel est l’effet du sommeil sur la mémoire ?',
    a: 'Pendant le sommeil, le cerveau consolide ce qui a été appris dans la journée. Une nuit courte après une séance fait perdre une bonne partie du travail.'
  }
]

export function starter(now: number): BrainData {
  const deck = 'starter'
  return {
    decks: [{ id: deck, name: 'Apprendre à apprendre', createdAt: now }],
    cards: STARTER.map((c, i) => ({ id: `starter-${i}`, deck, ...c, ...fresh(now) })),
    reviews: {},
    attempts: [],
    bets: [],
    goals: [],
    session: null,
    concepts: []
  }
}
