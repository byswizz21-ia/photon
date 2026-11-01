// Côté Windows du pont : un canal par fonction de window.photon, entrées validées ici.
import { clipboard, ipcMain, type IpcMainEvent, type IpcMainInvokeEvent } from 'electron'
import type { AppState } from '../shared/api'
import type { Settings } from '../shared/model'
import { pickImage } from './background'
import { calendar, onProfileSaved } from './calendar'
import {
  ask,
  claudeState,
  newConversation,
  openConversation,
  saveImage,
  stopAnswer,
  validFiles
} from './claude'
import { data, saveProfile, saveTheme } from './data'
import { cpuRam, disks, fileIcon, launch, pickApps } from './system'
import { hideWindow, logShown, ownsSender } from './window'

interface IpcActions {
  ready: () => void
  updateSettings: (patch: Partial<Settings>) => Promise<Settings>
}

const MAX_TEXT = 100_000 // caractères : question, presse-papier

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

// Réglages modifiables depuis l'interface. Profil et thème actifs : pas de bascule avant la V3
// (changer de fichier sans recharger écraserait le nouveau profil avec l'ancien).
const EDITABLE: readonly string[] = ['shortcut', 'mode', 'alwaysOnTop', 'reduceMotion']

const editable = (patch: unknown): Partial<Settings> =>
  isObject(patch)
    ? Object.fromEntries(Object.entries(patch).filter(([key]) => EDITABLE.includes(key)))
    : {}

// Seule la fenêtre de Photon peut appeler le pont.
function handle(channel: string, run: (...args: unknown[]) => unknown): void {
  ipcMain.handle(channel, (event: IpcMainInvokeEvent, ...args: unknown[]) => {
    if (!ownsSender(event.sender)) throw new Error(`Appel refusé : ${channel}`)
    return run(...args)
  })
}

function on(channel: string, run: (...args: unknown[]) => void): void {
  ipcMain.on(channel, (event: IpcMainEvent, ...args: unknown[]) => {
    if (ownsSender(event.sender)) run(...args)
  })
}

export function registerIpc(actions: IpcActions): void {
  handle('photon:load', (): AppState => ({ ...data }))
  on('photon:ready', actions.ready)
  handle('photon:saveSettings', (patch) => actions.updateSettings(editable(patch)))
  handle('photon:saveTheme', (raw) => saveTheme(raw)) // validé par parseTheme
  handle('photon:saveProfile', async (raw) => {
    await saveProfile(raw) // validé par parseProfile
    onProfileSaved()
  })
  on('photon:hide', (reason) => hideWindow(typeof reason === 'string' ? reason : 'interface'))
  on('photon:shown', logShown)
  handle('photon:cpuRam', cpuRam)
  handle('photon:disks', disks)
  handle('photon:fileIcon', (path) => (typeof path === 'string' ? fileIcon(path) : null))
  // Lancer une app depuis Photon le cache, seulement si Windows a pu l'ouvrir.
  handle('photon:launch', async (path) => {
    const launched = typeof path === 'string' && (await launch(path))
    if (launched) hideWindow('app lancée')
    return launched
  })
  handle('photon:pickApps', pickApps)
  handle('photon:calendar', calendar)
  handle('photon:claudeState', claudeState)
  handle('photon:claudeAsk', (text, files) =>
    typeof text === 'string' && text.length <= MAX_TEXT ? ask(text, validFiles(files)) : false
  )
  on('photon:claudeStop', stopAnswer)
  on('photon:claudeNew', newConversation)
  on('photon:claudeOpen', openConversation)
  handle('photon:claudeImage', saveImage) // PNG vérifié, 10 Mo au plus
  handle('photon:clipboardText', async () => (await clipboard.readText()).slice(0, MAX_TEXT))
  on('photon:copyText', (text) => {
    if (typeof text === 'string') void clipboard.writeText(text.slice(0, MAX_TEXT))
  })
  handle('photon:pickImage', pickImage)
}
