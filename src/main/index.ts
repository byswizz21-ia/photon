// Démarrage de Photon : instance unique, données, fenêtre cachée, zone de notification, raccourci.
import { app, globalShortcut } from 'electron'
import { BAR_SHORTCUTS, SHORTCUTS, type Settings } from '../shared/model'
import { registerBackgroundScheme, serveBackgrounds } from './background'
import { startCalendars } from './calendar'
import { leaveBypass, loadClaude } from './claude'
import { data, loadAll, saveSettings } from './data'
import { allWrites } from './store'
import { registerIpc } from './ipc'
import { loadSearch } from './search/search'
import { loadMusic } from './music'
import { startWeather } from './weather'
import { startMarkets } from './markets'
import { startNews } from './news'
import { startChess } from './chess'
import { syncClipboard } from './clipboard'
import { registerShortcut } from './shortcut'
import { createTray, refreshTray } from './tray'
import {
  allowQuit,
  applyMode,
  createWindow,
  hideWindow,
  isVisible,
  send,
  showWindow,
  toggleBar,
  toggleWindow
} from './window'
import { startScreens } from './screens'
import { startBackdrop } from './backdrop'
import { leaveFocus } from './focus'
import { startAuto } from './auto'
import { startReminders } from './reminders'
import { startFeeds } from './feeds'
import { stopScripts } from './scripts'
import { createToasts } from './toast'

// Argument passé par le lancement au démarrage de Windows : rester caché dans la zone de notif.
const HIDDEN_ARG = '--hidden'
const startHidden = process.argv.includes(HIDDEN_ARG)

let activeShortcut: string | null = null
let booted = false
let leaving = false

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

// Quitter (zone de notif, arrêt de Windows) : Photon ouvert se cache d'abord, ce qui fait partir
// les sauvegardes en attente de l'interface ; on attend leur écriture et le retour du « Ne pas
// déranger » d'avant le Focus, 3 s au plus, puis on quitte pour de bon.
function beforeQuit(event: Electron.Event): void {
  allowQuit()
  if (leaving) return
  leaving = true
  event.preventDefault()
  const visible = booted && isVisible()
  if (visible) hideWindow('Photon quitte')
  const settled = (visible ? delay(300) : Promise.resolve()).then(() =>
    Promise.all([allWrites(), leaveFocus(), stopScripts()])
  )
  void Promise.race([settled, delay(3000)]).finally(() => app.quit())
}

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
  const previousBar = data.settings.barShortcut
  const settings = await saveSettings(patch)
  if (settings.shortcut !== previousShortcut) {
    activeShortcut = registerShortcut('photon', settings.shortcut, SHORTCUTS, toggleWindow)
  }
  if (settings.barShortcut !== previousBar) {
    registerShortcut('bar', settings.barShortcut, BAR_SHORTCUTS, toggleBar)
  }
  applyMode()
  refreshTray(activeShortcut)
  send('photon:settings', settings)
  return settings
}

// Interface prête : on affiche au lancement manuel, ou on renvoie l'état si déjà visible.
function onRendererReady(): void {
  if (isVisible() || (!booted && !startHidden)) void showWindow()
  booted = true
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('before-quit', beforeQuit)
  app.on('will-quit', () => globalShortcut.unregisterAll())
  registerBackgroundScheme() // doit précéder app.whenReady()

  void app.whenReady().then(async () => {
    await Promise.all([loadAll(), loadClaude(), loadSearch()])
    serveBackgrounds()
    registerIpc({ ready: onRendererReady, updateSettings })
    const win = createWindow().on('hide', leaveBypass) // Bypass ne survit pas à la fermeture
    startBackdrop(win)
    createToasts() // cachée, prête pour la première notification
    // Branché après la fenêtre : un 2e lancement pendant le démarrage ne trouve pas de fenêtre vide.
    app.on('second-instance', showWindow)
    activeShortcut = registerShortcut('photon', data.settings.shortcut, SHORTCUTS, toggleWindow)
    const barShortcut = registerShortcut('bar', data.settings.barShortcut, BAR_SHORTCUTS, toggleBar)
    console.log(
      `[photon] raccourcis : ${activeShortcut ?? 'aucun'}, barre ${barShortcut ?? 'aucun'}`
    )
    const update = (patch: Partial<Settings>): void => void updateSettings(patch)
    createTray({ toggle: toggleWindow, update, quit: () => app.quit() }, activeShortcut)
    enableLaunchAtLogin()
    startCalendars()
    startWeather()
    startMarkets()
    startNews()
    startChess()
    syncClipboard()
    loadMusic()
    startScreens()
    startAuto()
    startReminders()
    startFeeds()
  })
}
