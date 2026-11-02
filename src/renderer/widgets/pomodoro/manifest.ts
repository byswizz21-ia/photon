// Widget « Pomodoro » : minuteur travail / pause. Un seul minuteur, tenu par Photon : il
// continue Photon caché ou profil changé, et prévient par une notification Windows.
import TimerIcon from 'phosphor-svelte/lib/TimerIcon'
import type { WidgetManifest } from '../types'
import Pomodoro from './Pomodoro.svelte'

export type PomodoroSettings = { focus: number; pause: number } // minutes

const manifest: WidgetManifest<PomodoroSettings> = {
  name: 'Pomodoro',
  category: 'time',
  description: 'Minuteur travail / pause, prévient par une notification.',
  icon: TimerIcon,
  size: { w: 3, h: 2, minW: 2, minH: 2 },
  defaults: { focus: 25, pause: 5 },
  component: Pomodoro
}

export default manifest
