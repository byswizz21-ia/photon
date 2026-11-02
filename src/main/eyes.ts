// Pause des yeux (règle 20-20-20) : toutes les N minutes, une notification « regarde au loin
// 20 secondes ». Tenu ici : continue Photon caché. Personne devant le PC : pas de rappel.
import { powerMonitor } from 'electron'
import type { EyesState } from '../shared/api'
import { data } from './data'
import { notify } from './notify'

const AWAY_S = 120 // inactif depuis 2 min : il fait déjà une pause

let timer: NodeJS.Timeout | undefined
let state: EyesState = { on: false, minutes: 20, next: null }

function remind(): void {
  if (powerMonitor.getSystemIdleTime() < AWAY_S) {
    notify('eyes', {
      title: 'Pause des yeux',
      body: 'Regarde quelque chose au loin pendant 20 secondes.',
      silent: true
    })
  }
  schedule()
}

function schedule(): void {
  clearTimeout(timer)
  const ms = state.minutes * 60_000
  state = { ...state, next: Date.now() + ms }
  timer = setTimeout(remind, ms)
}

// Réglé par le widget à chaque changement. Même réglage : le décompte en cours continue.
export function eyesSet(on: unknown, minutes: unknown): EyesState {
  const valid =
    typeof on === 'boolean' &&
    typeof minutes === 'number' &&
    Number.isInteger(minutes) &&
    minutes >= 5 &&
    minutes <= 120
  if (!valid || (on === state.on && minutes === state.minutes)) return eyes()
  state = { on, minutes, next: null }
  if (on) schedule()
  else clearTimeout(timer)
  return eyes()
}

export const eyes = (): EyesState => ({ ...state })

// Profil enregistré ou changé : sans widget allumé pour les régler, les rappels s'arrêtent (sinon
// plus rien ne permettrait de les couper). Le widget les relance à son retour.
export function syncEyes(): void {
  const wanted = data.profile.widgets.some((w) => w.type === 'eyes' && w.settings['on'] === true)
  if (state.on && !wanted) eyesSet(false, state.minutes)
}
