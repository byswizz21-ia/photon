// Problèmes d'échecs du widget Échecs (Lichess, gratuit, sans compte) : celui du jour, lu en fond
// (démarrage puis toutes les heures, s'il y a un widget), et un problème d'entraînement gardé
// d'avance. L'interface ne lit que le cache ; en prendre un relance la lecture du suivant.
import { net } from 'electron'
import type { ChessPuzzle } from '../shared/api'
import { dayKey } from '../shared/day'
import { data } from './data'

const REFRESH_MS = 60 * 60_000
const RETRY_MS = 5 * 60_000
const TIMEOUT_MS = 10_000
const UCI = /^[a-h][1-8][a-h][1-8][qrbn]?$/

let daily: ChessPuzzle | null = null
let dailyDay = ''
let spare: ChessPuzzle | null = null
let spareRead: Promise<void> | null = null
let timer: NodeJS.Timeout | undefined

const strings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string') : []

// Réponse Lichess → problème ; la position est déjà donnée (fen) après le coup adverse.
export function parsePuzzle(json: unknown): ChessPuzzle | null {
  const puzzle = (json as { puzzle?: Record<string, unknown> } | null)?.puzzle
  const solution = strings(puzzle?.['solution'])
  const fen = puzzle?.['fen']
  const id = puzzle?.['id']
  if (typeof fen !== 'string' || typeof id !== 'string') return null
  if (!solution.length || !solution.every((m) => UCI.test(m))) return null
  const lastMove = puzzle?.['lastMove']
  return {
    id,
    fen,
    solution,
    lastMove: typeof lastMove === 'string' && UCI.test(lastMove) ? lastMove : null,
    rating: typeof puzzle?.['rating'] === 'number' ? puzzle['rating'] : 0,
    themes: strings(puzzle?.['themes']).slice(0, 6)
  }
}

async function download(path: string): Promise<ChessPuzzle> {
  const response = await net.fetch(`https://lichess.org/api/puzzle/${path}`, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS)
  })
  const puzzle = response.ok ? parsePuzzle(await response.json()) : null
  if (!puzzle) throw new Error(`réponse ${response.status}`)
  return puzzle
}

const wanted = (): boolean => data.profile.widgets.some((widget) => widget.type === 'chess')

function readSpare(): Promise<void> {
  spareRead ??= download('next')
    .then((puzzle) => void (spare = puzzle))
    .catch((error: unknown) =>
      console.warn(`[photon] problème d'échecs illisible : ${String(error)}`)
    )
    .finally(() => (spareRead = null))
  return spareRead
}

async function refresh(): Promise<void> {
  clearTimeout(timer)
  let ok = true
  if (wanted()) {
    const today = dayKey(new Date())
    if (dailyDay !== today) {
      try {
        daily = await download('daily')
        dailyDay = today
      } catch (error) {
        ok = false // celui d'hier reste affiché
        console.warn(`[photon] problème du jour illisible : ${String(error)}`)
      }
    }
    if (!spare) await readSpare()
  }
  timer = setTimeout(() => void refresh(), ok ? REFRESH_MS : RETRY_MS)
}

export function startChess(): void {
  void refresh()
}

// Widget ajouté : lecture tout de suite (geste de l'utilisateur). Une seule à la fois : chaque
// déplacement de widget enregistre le profil.
let refreshing: Promise<void> | null = null

export function onChessProfile(): void {
  if (refreshing || !wanted() || (daily && spare)) return
  refreshing = refresh().finally(() => (refreshing = null))
}

// 'daily' : cache seulement. 'next' : rend le problème d'avance et lit le suivant ; aucun
// d'avance (hors ligne, premier clic trop rapide) : attend la lecture en cours.
export async function chessPuzzle(kind: unknown): Promise<ChessPuzzle | null> {
  if (kind === 'daily') return daily
  if (kind !== 'next') return null
  if (!spare) await readSpare()
  const puzzle = spare
  spare = null
  void readSpare()
  return puzzle
}
