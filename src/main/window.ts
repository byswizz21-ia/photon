// Fenêtre unique de Photon : créée cachée au démarrage, ensuite seulement affichée ou cachée.
import { BrowserWindow } from 'electron'
import { join } from 'node:path'
import icon from '../../assets/icon.ico?asset'

let win: BrowserWindow
let quitting = false
let showStartedAt = 0

export function createWindow(): BrowserWindow {
  win = new BrowserWindow({
    show: false,
    width: 1100,
    height: 720,
    frame: false,
    backgroundMaterial: 'acrylic',
    backgroundColor: '#00000000',
    skipTaskbar: true,
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      backgroundThrottling: false,
      spellcheck: false
    }
  })
  // Alt+F4 cache au lieu de détruire : la fenêtre doit rester vivante pour s'ouvrir sans chargement.
  win.on('close', (event) => {
    if (quitting) return
    event.preventDefault()
    hideWindow()
  })
  // Arrêt ou déconnexion de Windows : laisser fermer, sinon Photon bloquerait l'arrêt.
  win.on('session-end', allowQuit)
  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl) void win.loadURL(devUrl)
  else void win.loadFile(join(__dirname, '../renderer/index.html'))
  return win
}

export function allowQuit(): void {
  quitting = true
}

export function showWindow(): void {
  showStartedAt = performance.now()
  win.webContents.send('photon:show')
  win.show()
  win.focus()
}

export function hideWindow(): void {
  if (!win.isVisible()) return
  win.hide()
  win.webContents.send('photon:hide')
}

export function toggleWindow(): void {
  if (win.isVisible() && win.isFocused()) hideWindow()
  else showWindow()
}

// Le renderer signale sa première image après l'affichage : délai raccourci → fenêtre visible.
export function logShown(): void {
  console.log(`[photon] affichage en ${Math.round(performance.now() - showStartedAt)} ms`)
}
