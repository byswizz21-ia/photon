// Fenêtre unique de Photon : créée cachée au démarrage, ensuite seulement affichée ou cachée.
// Plein écran = fenêtre sans bordure à la taille de l'écran (pas le fullscreen natif) ;
// mode fenêtre = fenêtre libre redimensionnable, position mémorisée.
import { BrowserWindow, screen, type Display, type Rectangle, type WebContents } from 'electron'
import { join } from 'node:path'
import icon from '../../assets/icon.ico?asset'
import { data, saveSettings } from './data'

const DEFAULT_SIZE = { width: 1100, height: 720 }
const MIN_SIZE = { width: 380, height: 320 }

let win: BrowserWindow
let quitting = false
let modals = 0 // boîte de dialogue ouverte : la perte de focus ne doit pas cacher Photon
let showStartedAt = 0

export function createWindow(): BrowserWindow {
  win = new BrowserWindow({
    show: false,
    ...DEFAULT_SIZE,
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
    hideWindow('Alt+F4')
  })
  // Arrêt ou déconnexion de Windows : laisser fermer, sinon Photon bloquerait l'arrêt.
  win.on('session-end', allowQuit)
  win.on('blur', () => {
    const fullscreen = data.settings.mode === 'fullscreen'
    if (fullscreen && modals === 0 && !win.webContents.isDevToolsFocused())
      hideWindow('focus perdu')
  })
  win.on('moved', rememberBounds)
  win.on('resized', rememberBounds)
  applyMode()
  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl) void win.loadURL(devUrl)
  else void win.loadFile(join(__dirname, '../renderer/index.html'))
  return win
}

export function allowQuit(): void {
  quitting = true
}

export function send(channel: string, payload?: unknown): void {
  win.webContents.send(channel, payload)
}

export function ownsSender(sender: WebContents): boolean {
  return sender === win.webContents
}

// Applique le mode courant (réglages) à la fenêtre, puis la replace si elle est affichée.
export function applyMode(): void {
  const fullscreen = data.settings.mode === 'fullscreen'
  win.setResizable(!fullscreen)
  win.setSkipTaskbar(fullscreen)
  win.setAlwaysOnTop(fullscreen || data.settings.alwaysOnTop)
  win.setMinimumSize(fullscreen ? 0 : MIN_SIZE.width, fullscreen ? 0 : MIN_SIZE.height)
  if (win.isVisible()) place(screen.getDisplayNearestPoint(screen.getCursorScreenPoint()))
}

export function showWindow(): void {
  showStartedAt = performance.now()
  const cursor = screen.getCursorScreenPoint()
  place(screen.getDisplayNearestPoint(cursor))
  const bounds = win.getBounds()
  send('photon:show', { origin: { x: cursor.x - bounds.x, y: cursor.y - bounds.y } })
  win.show()
  win.focus()
}

export function hideWindow(reason: string): void {
  if (!win.isVisible()) return
  win.hide()
  send('photon:hide')
  console.log(`[photon] caché : ${reason}`)
}

export function toggleWindow(): void {
  if (win.isVisible() && win.isFocused()) hideWindow('raccourci')
  else showWindow()
}

export function isVisible(): boolean {
  return win.isVisible()
}

// Ouvre une boîte de dialogue liée à Photon sans que la perte de focus le cache.
export async function withModal<T>(open: (parent: BrowserWindow) => Promise<T>): Promise<T> {
  modals++
  try {
    return await open(win)
  } finally {
    modals--
    win.focus()
  }
}

// Le renderer signale sa première image après l'affichage : délai raccourci → fenêtre visible.
export function logShown(): void {
  console.log(`[photon] affichage en ${Math.round(performance.now() - showStartedAt)} ms`)
}

function place(display: Display): void {
  const target = data.settings.mode === 'fullscreen' ? display.bounds : windowBoundsOn(display)
  win.setBounds(target)
  // Entre deux écrans d'échelles différentes, Electron peut se tromper au premier essai.
  if (!sameRect(win.getBounds(), target)) win.setBounds(target)
}

// Mode fenêtre : position mémorisée ; sur un autre écran, même position relative, bornée.
function windowBoundsOn(display: Display): Rectangle {
  const area = display.workArea
  const saved = data.settings.windowBounds
  const width = Math.min(saved?.width ?? DEFAULT_SIZE.width, area.width)
  const height = Math.min(saved?.height ?? DEFAULT_SIZE.height, area.height)
  if (!saved) {
    return {
      x: area.x + Math.round((area.width - width) / 2),
      y: area.y + Math.round((area.height - height) / 2),
      width,
      height
    }
  }
  const from = screen.getDisplayMatching(saved).workArea
  return {
    x: clamp(saved.x + area.x - from.x, area.x, area.x + area.width - width),
    y: clamp(saved.y + area.y - from.y, area.y, area.y + area.height - height),
    width,
    height
  }
}

function rememberBounds(): void {
  if (data.settings.mode === 'window' && win.isVisible()) {
    void saveSettings({ windowBounds: win.getBounds() })
  }
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

const sameRect = (a: Rectangle, b: Rectangle): boolean =>
  a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height
