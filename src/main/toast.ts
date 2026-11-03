// Fenêtre des notifications de Photon : transparente, toujours devant, jamais active (elle ne
// vole pas le clavier). Créée cachée au démarrage, montrée au coin bas-droit de l'écran du
// curseur tant qu'une carte est à l'écran. Les zones vides laissent passer la souris.
import { app, BrowserWindow, ipcMain, screen, type IpcMainEvent } from 'electron'
import { join } from 'node:path'
import type { Toast, ToastLook } from '../shared/api'
import { data } from './data'
import type { NotifyOptions } from './notify'

const SIZE = { width: 400, height: 600 } // 4 cartes au plus, plus la place des ombres
const LOOK_KEYS = ['accent', 'onAccent', 'font'] as const

let win: BrowserWindow | undefined
let look: ToastLook | null = null
let nextId = 1
// Ce que font la carte et ses boutons, jusqu'à sa fermeture.
const handlers = new Map<number, { click: () => void; actions: (() => void)[] }>()

export function createToasts(): void {
  const toasts = new BrowserWindow({
    show: false,
    ...SIZE,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    focusable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: join(__dirname, '../preload/toast.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      backgroundThrottling: false,
      autoplayPolicy: 'no-user-gesture-required', // tintement sans clic préalable
      spellcheck: false
    }
  })
  win = toasts
  toasts.setAlwaysOnTop(true, 'screen-saver') // au-dessus de Photon plein écran
  toasts.setIgnoreMouseEvents(true, { forward: true })
  toasts.webContents.on('will-navigate', (event) => event.preventDefault())
  toasts.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  toasts.webContents.on('render-process-gone', (_event, { reason }) => {
    if (reason === 'clean-exit' || toasts.isDestroyed()) return
    handlers.clear()
    toasts.hide()
    toasts.webContents.reload()
  })
  toasts.webContents.on(
    'did-finish-load',
    () => look && toasts.webContents.send('toast:look', look)
  )

  const on = (channel: string, run: (...args: unknown[]) => void): void => {
    ipcMain.on(channel, (event: IpcMainEvent, ...args: unknown[]) => {
      if (event.sender === toasts.webContents) run(...args)
    })
  }
  on('toast:click', (id, action) => {
    const handler = typeof id === 'number' ? handlers.get(id) : undefined
    if (!handler) return
    handlers.delete(id as number)
    const run = typeof action === 'number' && action >= 0 ? handler.actions[action] : handler.click
    run?.()
  })
  on('toast:close', (id) => typeof id === 'number' && handlers.delete(id))
  on('toast:hover', (inside) => toasts.setIgnoreMouseEvents(inside !== true, { forward: true }))
  on('toast:empty', () => {
    toasts.setIgnoreMouseEvents(true, { forward: true })
    toasts.hide()
  })

  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl && !app.isPackaged) void toasts.loadURL(`${devUrl}/toast.html`)
  else void toasts.loadFile(join(__dirname, '../renderer/toast.html'))
}

export function showToast(source: string, options: NotifyOptions, onClick: () => void): void {
  if (!win || win.isDestroyed()) return
  const id = nextId++
  const actions = options.actions ?? []
  handlers.set(id, { click: onClick, actions: actions.map((a) => a.run) })
  const { sound, reduceMotion } = data.settings
  const toast: Toast = {
    id,
    source,
    title: options.title,
    body: options.body ?? '',
    image: options.image?.startsWith('data:image/') ? options.image : null,
    actions: actions.map((a) => a.label),
    sticky: options.sticky === true,
    sound: options.silent || !sound.enabled ? 0 : sound.volume,
    preset: sound.preset,
    still: reduceMotion
  }
  if (!win.isVisible()) {
    // Écran du curseur, au-dessus de la barre des tâches.
    const area = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea
    win.setBounds({
      x: area.x + area.width - SIZE.width,
      y: area.y + area.height - SIZE.height,
      ...SIZE
    })
    win.showInactive()
  }
  win.webContents.send('toast:show', toast)
}

// Thème envoyé par l'interface (accent « auto » calculé là-bas) : contrôlé avant de passer à
// l'autre fenêtre.
export function setToastLook(raw: unknown): void {
  if (typeof raw !== 'object' || raw === null) return
  const v = raw as Record<string, unknown>
  const text = LOOK_KEYS.every((key) => {
    const value = v[key]
    return typeof value === 'string' && value.length < 300
  })
  const numbers = [v.radius, v.weight, v.scale].every((n) => typeof n === 'number' && isFinite(n))
  if (!text || !numbers) return
  look = {
    accent: v.accent as string,
    onAccent: v.onAccent as string,
    radius: v.radius as number,
    font: v.font as string,
    weight: v.weight as number,
    scale: v.scale as number
  }
  if (win && !win.isDestroyed()) win.webContents.send('toast:look', look)
}
