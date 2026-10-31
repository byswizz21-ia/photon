// Côté Windows du pont : un canal par fonction de window.photon, entrées validées ici.
import { ipcMain, type IpcMainEvent, type IpcMainInvokeEvent } from 'electron'
import type { AppState } from '../shared/api'
import type { Settings } from '../shared/model'
import { data, saveProfile } from './data'
import { hideWindow, logShown, ownsSender } from './window'

interface IpcActions {
  ready: () => void
  updateSettings: (patch: Partial<Settings>) => Promise<Settings>
}

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
  handle('photon:saveProfile', (raw) => saveProfile(raw)) // validé par parseProfile
  on('photon:hide', (reason) => hideWindow(typeof reason === 'string' ? reason : 'interface'))
  on('photon:shown', logShown)
}
