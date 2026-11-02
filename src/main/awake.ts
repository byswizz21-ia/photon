// Anti-veille : empêche Windows de mettre le PC en veille (et l'écran, au choix), pour une durée
// ou jusqu'à l'arrêt. Tenu ici : continue Photon caché ; libéré par Windows si Photon quitte.
import { powerSaveBlocker } from 'electron'
import type { AwakeState } from '../shared/api'
import { data } from './data'

let blocker: number | null = null
let timer: NodeJS.Timeout | undefined
let state: AwakeState = { on: false, screen: false, until: null }

export function awakeStop(): AwakeState {
  clearTimeout(timer)
  if (blocker !== null && powerSaveBlocker.isStarted(blocker)) powerSaveBlocker.stop(blocker)
  blocker = null
  state = { on: false, screen: false, until: null }
  return awake()
}

// minutes : 1 à 1440, ou null jusqu'à l'arrêt. screen : l'écran reste allumé aussi.
export function awakeStart(minutes: unknown, screen: unknown): AwakeState {
  const valid =
    minutes === null ||
    (typeof minutes === 'number' && Number.isInteger(minutes) && minutes >= 1 && minutes <= 1440)
  if (!valid || typeof screen !== 'boolean') return awake()
  awakeStop()
  blocker = powerSaveBlocker.start(screen ? 'prevent-display-sleep' : 'prevent-app-suspension')
  const until = minutes === null ? null : Date.now() + minutes * 60_000
  if (minutes !== null) timer = setTimeout(awakeStop, minutes * 60_000)
  state = { on: true, screen, until }
  return awake()
}

export const awake = (): AwakeState => ({ ...state })

// Profil enregistré ou changé : sans widget Anti-veille pour la couper, l'anti-veille s'arrête
// (sinon « jusqu'à l'arrêt » tiendrait le PC éveillé sans aucun moyen de l'arrêter).
export function syncAwake(): void {
  if (state.on && !data.profile.widgets.some((w) => w.type === 'awake')) awakeStop()
}
