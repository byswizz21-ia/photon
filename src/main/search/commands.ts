// Commandes de la barre (préfixe « > ») : système Windows et actions de Photon.
// Les commandes lourdes (redémarrer, éteindre…) demandent une 2e validation dans la barre.
import { spawn } from 'node:child_process'
import { musicAvailable, musicControl, openMusic } from '../music'
import { pomodoroCommand } from '../pomodoro'

export interface Command {
  id: string
  title: string
  keywords: string // autres mots qui la trouvent
  confirm: boolean
  ui: boolean // exécutée par l'interface (grille, réglages), pas par Windows
  available?: () => boolean
  run: () => void
}

const start = (file: string, args: string[]) => (): void =>
  spawn(file, args, { detached: true, windowsHide: true }).unref()

const powershell = (script: string): (() => void) =>
  start('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script])

const system = (
  id: string,
  title: string,
  keywords: string,
  confirm: boolean,
  run: () => void
) => ({
  id,
  title,
  keywords,
  confirm,
  ui: false,
  run
})

const ui = (id: string, title: string, keywords: string): Command => ({
  id,
  title,
  keywords,
  confirm: false,
  ui: true,
  run: () => {}
})

const music = (id: string, title: string, keywords: string, run: () => void): Command => ({
  ...system(id, title, keywords, false, run),
  available: musicAvailable
})

export const COMMANDS: readonly Command[] = [
  system(
    'lock',
    'Verrouiller le PC',
    'lock session',
    false,
    start('rundll32.exe', ['user32.dll,LockWorkStation'])
  ),
  // rundll32 SetSuspendState peut mettre en veille prolongée : on passe par .NET.
  system(
    'sleep',
    'Mettre en veille',
    'veille sleep suspendre',
    false,
    powershell(
      "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Application]::SetSuspendState('Suspend', $false, $false)"
    )
  ),
  system(
    'restart',
    'Redémarrer le PC',
    'redemarrer reboot restart',
    true,
    start('shutdown.exe', ['/r', '/t', '0'])
  ),
  system(
    'shutdown',
    'Éteindre le PC',
    'eteindre arreter shutdown',
    true,
    start('shutdown.exe', ['/s', '/t', '0'])
  ),
  system(
    'logoff',
    'Se déconnecter',
    'deconnexion logout session',
    true,
    start('shutdown.exe', ['/l'])
  ),
  system(
    'recycle',
    'Vider la corbeille',
    'corbeille poubelle recycle',
    true,
    powershell('Clear-RecycleBin -Force -ErrorAction SilentlyContinue')
  ),
  music(
    'music-toggle',
    'Lecture / pause de la musique',
    'musique play pause yt',
    () => void musicControl('toggle')
  ),
  music(
    'music-next',
    'Morceau suivant',
    'musique suivant next skip',
    () => void musicControl('next')
  ),
  music(
    'music-previous',
    'Morceau précédent',
    'musique precedent previous',
    () => void musicControl('previous')
  ),
  music('music-open', 'Ouvrir YT Music', 'musique youtube music', openMusic),
  system(
    'pomodoro-start',
    'Lancer un pomodoro',
    'pomodoro minuteur focus travail',
    false,
    pomodoroCommand('start')
  ),
  system(
    'pomodoro-pause',
    'Mettre le pomodoro en pause',
    'pomodoro pause minuteur',
    false,
    pomodoroCommand('pause')
  ),
  system(
    'pomodoro-reset',
    'Arrêter le pomodoro',
    'pomodoro stop arreter minuteur',
    false,
    pomodoroCommand('reset')
  ),
  ui('edit', 'Modifier la grille', 'widgets ajouter edition'),
  ui('settings', 'Réglages de Photon', 'parametres theme fond raccourci')
]
