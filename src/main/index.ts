// Démarrage de Photon : instance unique, données, fenêtre cachée, zone de notification, raccourci.
import { app, globalShortcut } from 'electron'
import type { Settings } from '../shared/model'
import { registerBackgroundScheme, serveBackgrounds } from './background'
import { startCalendars } from './calendar'
import { loadClaude } from './claude'
import { data, loadAll, saveSettings } from './data'
import { registerIpc } from './ipc'
import { loadMusic } from './music'
import { registerShortcut } from './shortcut'
import { createTray, refreshTray } from './tray'
import {
  allowQuit,
  applyMode,
  createWindow,
  isVisible,
  send,
  showWindow,
  toggleWindow
} from './window'

// Argument passé par le lancement au démarrage de Windows : rester caché dans la zone de notif.
const HIDDEN_ARG = '--hidden'
const startHidden = process.argv.includes(HIDDEN_ARG)

let activeShortcut: string | null = null
let booted = false

function enableLaunchAtLogin(): void {
  if (!app.isPackaged) return // en dev, on n'inscrit pas electron.exe au démarrage
  const options = { args: [HIDDEN_ARG] }
  // Vérifier d'abord : si l'utilisateur l'a désactivé dans Windows, on ne le réactive pas.
  if (!app.getLoginItemSettings(options).openAtLogin) {
    app.setLoginItemSettings({ ...options, openAtLogin: true })
  }
}

// Réglages modifiés (zone de notif ou interface) : sauvegarde puis application partout.
async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  const previousShortcut = data.settings.shortcut
  const settings = await saveSettings(patch)
  if (settings.shortcut !== previousShortcut) {
    activeShortcut = registerShortcut(settings.shortcut, toggleWindow)
  }
  applyMode()
  refreshTray(activeShortcut)
  send('photon:settings', settings)
  return settings
}

// Interface prête : on affiche au lancement manuel, ou on renvoie l'état si déjà visible.
function onRendererReady(): void {
  if (isVisible() || (!booted && !startHidden)) showWindow()
  booted = true
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('before-quit', allowQuit)
  app.on('will-quit', () => globalShortcut.unregisterAll())
  registerBackgroundScheme() // doit précéder app.whenReady()

  void app.whenReady().then(async () => {
    await Promise.all([loadAll(), loadClaude()])
    serveBackgrounds()
    registerIpc({ ready: onRendererReady, updateSettings })
    createWindow()
    // Branché après la fenêtre : un 2e lancement pendant le démarrage ne trouve pas de fenêtre vide.
    app.on('second-instance', showWindow)
    activeShortcut = registerShortcut(data.settings.shortcut, toggleWindow)
    console.log(`[photon] raccourci actif : ${activeShortcut ?? 'aucun'}`)
    const update = (patch: Partial<Settings>): void => void updateSettings(patch)
    createTray({ toggle: toggleWindow, update, quit: () => app.quit() }, activeShortcut)
    enableLaunchAtLogin()
    startCalendars()
    loadMusic()
  })
}
