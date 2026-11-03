// Calcul du bot hors de l'interface (Web Worker) : reçoit la partie, renvoie son coup.
import { bestMove, type Level } from './engine'

export type BotRequest = { id: number; fen: string; moves: string[]; level: Level }
export type BotReply = { id: number; move: string | null }

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<BotRequest>) => void) | null
  postMessage(reply: BotReply): void
}

scope.onmessage = ({ data }) =>
  scope.postMessage({ id: data.id, move: bestMove(data.fen, data.level, data.moves) })
