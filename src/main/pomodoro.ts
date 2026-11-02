// Pomodoro, partagé par tous les profils : tenu ici, il continue Photon caché ou profil changé.
// Fin du travail : notification et pause lancée d'office ; fin de la pause : notification.
import type { PomodoroCommand, PomodoroState } from '../shared/api'
import { notify } from './notify'

const MINUTE = 60_000
const DEFAULT = { focus: 25, pause: 5 }

let state: PomodoroState = { phase: 'idle', running: false, endsAt: 0, left: 0, total: 0 }
// Dernières durées choisies (widget) : reprises par la barre de commande.
let focusMs = DEFAULT.focus * MINUTE
let pauseMs = DEFAULT.pause * MINUTE
let timer: NodeJS.Timeout | undefined
let reminders = false // profil Focus actif (src/main/focus.ts)

export const setReminders = (on: boolean): void => {
  reminders = on
}

const xml = (text: string): string => text.replace(/[<>&"]/g, (c) => `&#${c.charCodeAt(0)};`)

// Rappel : passe « Ne pas déranger » (réglage par défaut de Windows 11) et reste affiché
// jusqu'au clic sur OK.
const reminderXml = (title: string, body: string): string =>
  `<toast scenario="reminder"><visual><binding template="ToastGeneric"><text>${xml(title)}</text>` +
  `<text>${xml(body)}</text></binding></visual><actions>` +
  `<action content="OK" arguments="dismiss" activationType="system"/></actions></toast>`

const minutes = (v: unknown, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(Math.max(Math.round(v), 1), 180) : fallback

function ring(title: string, body: string): void {
  notify('pomodoro', reminders ? { title, toastXml: reminderXml(title, body) } : { title, body })
}

function run(phase: 'focus' | 'pause', total: number, left = total): void {
  clearTimeout(timer)
  state = { phase, running: true, endsAt: Date.now() + left, left, total }
  timer = setTimeout(finish, left)
}

function finish(): void {
  if (state.phase === 'focus') {
    ring('Pause !', `${Math.round(pauseMs / MINUTE)} min pour souffler.`)
    run('pause', pauseMs)
  } else {
    ring('Pause terminée', 'Prêt pour un nouveau pomodoro ?')
    reset()
  }
}

function reset(): void {
  clearTimeout(timer)
  state = { phase: 'idle', running: false, endsAt: 0, left: 0, total: 0 }
}

// start : reprend une phase en pause, sinon lance un pomodoro (durées en minutes, bornées).
export function pomodoroControl(command: unknown, focus?: unknown, pause?: unknown): PomodoroState {
  if (command === 'start') {
    if (state.phase !== 'idle' && !state.running) run(state.phase, state.total, state.left)
    else if (!state.running) {
      focusMs = minutes(focus, focusMs / MINUTE) * MINUTE
      pauseMs = minutes(pause, pauseMs / MINUTE) * MINUTE
      run('focus', focusMs)
    }
  } else if (command === 'pause' && state.running) {
    clearTimeout(timer)
    state = { ...state, running: false, left: Math.max(0, state.endsAt - Date.now()) }
  } else if (command === 'skip' && state.phase !== 'idle') finish()
  else if (command === 'reset') reset()
  return pomodoro()
}

export const pomodoro = (): PomodoroState => ({ ...state })

export const pomodoroRunning = (): boolean => state.running

// Pour la barre de commande.
export const pomodoroCommand = (command: PomodoroCommand) => (): void =>
  void pomodoroControl(command)
