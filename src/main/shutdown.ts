// Minuteur d'arrêt : éteindre, redémarrer ou mettre en veille le PC dans N minutes. Tenu ici :
// continue Photon caché. Prévient 2 min avant ; arrêt et redémarrage passent par « shutdown /t 60 »
// (Windows affiche son propre avertissement, « shutdown /a » l'annule jusqu'au bout).
import { execFile } from 'node:child_process'
import type { ShutdownAction, ShutdownState } from '../shared/api'
import { data } from './data'
import { notify } from './notify'

const MINUTE = 60_000
const WINDOWS_DELAY_S = 60 // compte à rebours laissé à Windows pour arrêt et redémarrage
const WARN_MS = 2 * MINUTE

const LABELS: Record<ShutdownAction, string> = {
  shutdown: 'Arrêt du PC',
  restart: 'Redémarrage du PC',
  sleep: 'Mise en veille du PC'
}

let state: ShutdownState = { action: null, at: null }
let timers: NodeJS.Timeout[] = []
let handedToWindows = false // « shutdown /t » lancé : l'annulation passe par « shutdown /a »

const run = (file: string, args: string[]): void => {
  execFile(file, args, { windowsHide: true }, (error) => {
    if (error) console.warn(`[photon] ${file} a échoué`, error.message)
  })
}

function act(action: ShutdownAction): void {
  if (action === 'sleep') {
    run('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      "Add-Type -AssemblyName System.Windows.Forms; [void][System.Windows.Forms.Application]::SetSuspendState('Suspend', $false, $false)"
    ])
    return
  }
  handedToWindows = true
  const flag = action === 'restart' ? '/r' : '/s'
  run('shutdown.exe', [flag, '/t', String(WINDOWS_DELAY_S), '/c', `Photon : ${LABELS[action]}.`])
}

export function shutdownCancel(): ShutdownState {
  for (const timer of timers) clearTimeout(timer)
  timers = []
  if (handedToWindows) run('shutdown.exe', ['/a'])
  handedToWindows = false
  state = { action: null, at: null }
  return shutdownState()
}

// minutes : 1 à 1440. Un minuteur en cours est remplacé.
export function shutdownStart(action: unknown, minutes: unknown): ShutdownState {
  const valid =
    (action === 'shutdown' || action === 'restart' || action === 'sleep') &&
    typeof minutes === 'number' &&
    Number.isInteger(minutes) &&
    minutes >= 1 &&
    minutes <= 1440
  if (!valid) return shutdownState()
  shutdownCancel()
  const ms = minutes * MINUTE
  state = { action, at: Date.now() + ms }
  // Arrêt / redémarrage : la main à Windows 60 s avant l'heure, pour finir pile à l'heure.
  const lead = action === 'sleep' ? 0 : WINDOWS_DELAY_S * 1000
  timers.push(setTimeout(() => act(action), Math.max(0, ms - lead)))
  timers.push(setTimeout(shutdownCancelQuiet, ms + 5000))
  if (ms > WARN_MS) {
    timers.push(
      setTimeout(
        () =>
          notify('always', {
            title: `${LABELS[action]} dans 2 minutes`,
            body: 'Ouvre Photon pour annuler.'
          }),
        ms - WARN_MS
      )
    )
  }
  return shutdownState()
}

// Heure passée : on oublie le minuteur sans annuler l'arrêt de Windows.
function shutdownCancelQuiet(): void {
  handedToWindows = false
  shutdownCancel()
}

export const shutdownState = (): ShutdownState => ({ ...state })

// Profil enregistré ou changé : sans widget Minuteur d'arrêt pour l'annuler, le minuteur s'arrête.
export function syncShutdown(): void {
  if (state.action && !data.profile.widgets.some((w) => w.type === 'shutdown')) shutdownCancel()
}
