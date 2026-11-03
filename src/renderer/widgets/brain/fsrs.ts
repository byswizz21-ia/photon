// Répétition espacée FSRS-4.5 (algorithme libre d'Anki, poids par défaut publiés) : chaque carte
// garde une stabilité (jours avant de tomber à 90 % de chances de s'en souvenir) et une difficulté
// (1 à 10). Une carte revient quand ses chances de rappel descendent à 90 %.
// ponytail: poids par défaut pour tout le monde ; les optimiser sur l'historique de Hugo quand il
// aura quelques milliers de révisions.

export type Grade = 1 | 2 | 3 | 4 // Encore, Difficile, Bien, Facile

export interface Memory {
  stability: number // jours
  difficulty: number // 1 à 10
  due: number // ms
  last: number // dernière révision, ms ; 0 : jamais vue
  reps: number
  lapses: number // oublis
}

const W = [
  0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474, 0.1367, 1.0461, 2.1072,
  0.0793, 0.3246, 1.587, 0.2272, 2.8755
] as const
const w = (i: number): number => W[i] ?? 0
const DECAY = -0.5
const FACTOR = 19 / 81 // avec DECAY : 90 % de rappel quand t = stabilité
const DAY = 86_400_000
const RELEARN = 10 * 60_000 // « Encore » : la carte revient dans 10 minutes
const MAX_DAYS = 365

export const fresh = (now: number): Memory => ({
  stability: 0,
  difficulty: 0,
  due: now,
  last: 0,
  reps: 0,
  lapses: 0
})

const clampD = (d: number): number => Math.min(10, Math.max(1, d))
const initD = (g: Grade): number => clampD(w(4) - (g - 3) * w(5))

// Chances de s'en souvenir maintenant (0 à 1) ; jamais vue : 0.
export function recall(m: Memory, now: number): number {
  if (m.reps === 0 || m.stability <= 0) return 0
  const days = Math.max(0, now - m.last) / DAY
  return (1 + (FACTOR * days) / m.stability) ** DECAY
}

export function review(m: Memory, g: Grade, now: number): Memory {
  let stability: number
  let difficulty: number
  if (m.reps === 0) {
    stability = w(g - 1)
    difficulty = initD(g)
  } else {
    const r = recall(m, now)
    const d = m.difficulty
    difficulty = clampD(w(7) * initD(4) + (1 - w(7)) * (d - w(6) * (g - 3)))
    stability =
      g === 1
        ? Math.min(
            m.stability,
            w(11) * d ** -w(12) * ((m.stability + 1) ** w(13) - 1) * Math.exp(w(14) * (1 - r))
          )
        : m.stability *
          (Math.exp(w(8)) *
            (11 - d) *
            m.stability ** -w(9) *
            (Math.exp(w(10) * (1 - r)) - 1) *
            (g === 2 ? w(15) : 1) *
            (g === 4 ? w(16) : 1) +
            1)
  }
  return {
    stability,
    difficulty,
    due: now + (g === 1 ? RELEARN : interval(stability) * DAY),
    last: now,
    reps: m.reps + 1,
    lapses: m.lapses + (g === 1 && m.reps > 0 ? 1 : 0)
  }
}

// À 90 % de rappel visé, l'intervalle vaut la stabilité ; un jour au moins, un an au plus.
const interval = (stability: number): number =>
  Math.min(MAX_DAYS, Math.max(1, Math.round(stability)))

// « 10 min », « 3 j », « 2 mois » : ce que donnerait chaque note, affiché sur les boutons.
export function delay(ms: number): string {
  const minutes = Math.round(ms / 60_000)
  if (minutes < 60) return `${minutes} min`
  const days = Math.round(ms / DAY)
  if (days < 31) return `${Math.max(1, days)} j`
  if (days < 365) return `${Math.round(days / 30)} mois`
  return '1 an'
}
