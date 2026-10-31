// Démarrage de Photon : instance unique, données, fenêtre cachée, zone de notification, raccourci.
import { app, globalShortcut, ipcMain } from 'electron'
import { data, loadAll } from './data'
import { registerShortcut } from './shortcut'
import { createTray } from './tray'
import { allowQuit, createWindow, hideWindow, logShown, showWindow, toggleWindow } from './window'

// Argument passé par le lancement au démarrage de Windows : rester caché dans la zone de notif.
const HIDDEN_ARG = '--hidden'

function enableLaunchAtLogin(): void {
  if (!app.isPackaged) return // en dev, on n'inscrit pas electron.exe au démarrage
  const options = { args: [HIDDEN_ARG] }
  // Vérifier d'abord : si l'utilisateur l'a désactivé dans Windows, on ne le réactive pas.
  if (!app.getLoginItemSettings(options).openAtLogin) {
    app.setLoginItemSettings({ ...options, openAtLogin: true })
  }
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', showWindow)
  app.on('before-quit', allowQuit)
  app.on('will-quit', () => globalShortcut.unregisterAll())

  void app.whenReady().then(async () => {
    await loadAll()
    ipcMain.on('photon:hide', hideWindow)
    ipcMain.on('photon:shown', logShown)
    const win = createWindow()
    createTray({ toggle: toggleWindow, quit: () => app.quit() })
    const shortcut = registerShortcut(data.settings.shortcut, toggleWindow)
    console.log(`[photon] raccourci actif : ${shortcut ?? 'aucun'}`)
    enableLaunchAtLogin()
    if (!process.argv.includes(HIDDEN_ARG)) win.once('ready-to-show', showWindow)
  })
}
