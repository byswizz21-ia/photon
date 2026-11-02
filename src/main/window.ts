// Fenêtre unique de Photon : créée cachée au démarrage, ensuite seulement affichée ou cachée.
// Plein écran = fenêtre sans bordure à la taille de l'écran (pas le fullscreen natif) ;
// mode fenêtre = fenêtre libre redimensionnable, position mémorisée.
import {
  app,
  BrowserWindow,
  Menu,
  screen,
  type Display,
  type Rectangle,
  type WebContents
} from 'electron'
import { join } from 'node:path'
import icon from '../../assets/icon.ico?asset'
import { data, saveSettings } from './data'
import { screensKey, targetDisplay } from './screens'
import { liveBlurOn } from './backdrop'

const DEFAULT_SIZE = { width: 1100, height: 720 }
const MIN_SIZE = { width: 380, height: 320 }

let win: BrowserWindow
let quitting = false
let modals = 0 // boîte de dialogue ouverte : la perte de focus ne doit pas cacher Photon
let showStartedAt = 0
let mini = false // seulement la barre de commande, petite et centrée
let moving = false // fenêtre en train d'être glissée (flou réglable)
const BAR_WIDTH = 680
const BAR_HEIGHT = { min: 64, max: 640 }

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
      // Photon s'ouvre au raccourci clavier, sans clic dans la page : sans ça, le son
      // d'ouverture (et celui d'une vidéo) attendrait un premier clic.
      autoplayPolicy: 'no-user-gesture-required',
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
  // L'interface ne quitte jamais sa page (fichier lâché, lien) et n'ouvre aucune fenêtre.
  win.webContents.on('will-navigate', (event) => event.preventDefault())
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  // Interface plantée : seul cas où on recharge, sinon le raccourci afficherait une fenêtre morte.
  win.webContents.on('render-process-gone', (_event, { reason }) => {
    if (reason === 'clean-exit' || win.isDestroyed()) return
    console.error(`[photon] interface arrêtée (${reason}), rechargement`)
    win.webContents.reload()
  })
  // App installée : pas de menu, donc pas de Ctrl+R, DevTools, zoom ni F11.
  if (app.isPackaged) Menu.setApplicationMenu(null)
  win.on('blur', () => {
    const fullscreen = data.settings.mode === 'fullscreen'
    if ((fullscreen || mini) && modals === 0 && !win.webContents.isDevToolsFocused())
      hideWindow('focus perdu')
  })
  win.on('moved', rememberBounds)
  win.on('resized', rememberBounds)
  win.on('move', sendPlace)
  win.on('resize', sendPlace)
  // Glisser la fenêtre : la capture suivrait avec une image de retard (le fond « traîne »),
  // on la masque jusqu'au lâcher.
  win.on('will-move', () => !moving && ((moving = true), sendPlace()))
  win.on('moved', () => ((moving = false), sendPlace()))
  applyMode()
  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl && !app.isPackaged) void win.loadURL(devUrl)
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
  win.setContentProtection(liveBlurOn()) // hors des captures, dont la sienne (flou réglable)
  win.setMinimumSize(fullscreen ? 0 : MIN_SIZE.width, fullscreen ? 0 : MIN_SIZE.height)
  if (win.isVisible()) place(screen.getDisplayMatching(win.getBounds()))
}

// Écran choisi par la règle multi-écran (src/main/screens.ts) ; aucun écran libre : barre seule.
export async function showWindow(): Promise<void> {
  const startedAt = performance.now()
  const target = await targetDisplay(data.settings.screen)
  if (target.mini) return showBar(target.display, startedAt)
  showStartedAt = startedAt
  if (mini) {
    mini = false
    applyMode() // la barre seule avait changé taille, premier plan et redimensionnement
  }
  place(target.display)
  // Révélation depuis le curseur, ou depuis le centre si Photon s'ouvre sur un autre écran.
  const cursor = screen.getCursorScreenPoint()
  const bounds = win.getBounds()
  const inside =
    cursor.x >= bounds.x &&
    cursor.y >= bounds.y &&
    cursor.x < bounds.x + bounds.width &&
    cursor.y < bounds.y + bounds.height
  const origin = inside
    ? { x: cursor.x - bounds.x, y: cursor.y - bounds.y }
    : { x: bounds.width / 2, y: bounds.height / 2 }
  send('photon:show', { origin, mini: false })
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
  else void showWindow()
}

// Mini-mode : la barre seule, centrée en haut de l'écran (de la souris par défaut), façon
// Spotlight. Sa hauteur suit le contenu (resizeBar), la largeur est fixe.
export function showBar(
  display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()),
  startedAt = performance.now()
): void {
  mini = true
  showStartedAt = startedAt
  const area = display.workArea
  win.setResizable(false)
  win.setSkipTaskbar(true)
  win.setAlwaysOnTop(true)
  win.setMinimumSize(0, 0)
  win.setBounds({
    x: area.x + Math.round((area.width - BAR_WIDTH) / 2),
    y: area.y + Math.round(area.height * 0.2),
    width: BAR_WIDTH,
    height: BAR_HEIGHT.min
  })
  send('photon:show', { origin: { x: BAR_WIDTH / 2, y: 0 }, mini: true })
  win.show()
  win.focus()
}

export function toggleBar(): void {
  if (mini && win.isVisible() && win.isFocused()) hideWindow('raccourci de la barre')
  else showBar()
}

export function resizeBar(height: number): void {
  if (!mini) return
  const bounds = win.getBounds()
  const next = clamp(Math.round(height), BAR_HEIGHT.min, BAR_HEIGHT.max)
  if (next !== bounds.height) win.setBounds({ ...bounds, height: next })
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
  sendPlace()
}

// Flou réglable : où se trouve l'écran par rapport à la fenêtre, pour y caler sa capture.
function sendPlace(): void {
  if (mini || !liveBlurOn()) return
  const bounds = win.getBounds()
  const display = screen.getDisplayMatching(bounds)
  send('photon:place', {
    id: display.id,
    x: display.bounds.x - bounds.x,
    y: display.bounds.y - bounds.y,
    width: display.bounds.width,
    height: display.bounds.height,
    moving
  })
}

// Mode fenêtre : position mémorisée ; sur un autre écran, même position relative, bornée.
function windowBoundsOn(display: Display): Rectangle {
  const area = display.workArea
  const saved = data.settings.windowBoundsByScreens[screensKey()] ?? data.settings.windowBounds
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
  if (!mini && data.settings.mode === 'window' && win.isVisible()) {
    const bounds = win.getBounds()
    const byScreens = { ...data.settings.windowBoundsByScreens }
    delete byScreens[screensKey()] // réinséré en dernier : les plus anciennes partent en premier
    void saveSettings({
      windowBounds: bounds,
      windowBoundsByScreens: { ...byScreens, [screensKey()]: bounds }
    })
  }
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

const sameRect = (a: Rectangle, b: Rectangle): boolean =>
  a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height
