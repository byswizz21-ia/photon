// Côté Windows du pont : un canal par fonction de window.photon, entrées validées ici.
import { ipcMain, type IpcMainEvent, type IpcMainInvokeEvent } from 'electron'
import type { AppState } from '../shared/api'
import type { Settings } from '../shared/model'
import { data } from './data'
import { hideWindow, logShown, ownsSender } from './window'

interface IpcActions {
  ready: () => void
  updateSettings: (patch: Partial<Settings>) => Promise<Settings>
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

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
  handle('photon:saveSettings', (patch) => actions.updateSettings(isObject(patch) ? patch : {}))
  on('photon:hide', (reason) => hideWindow(typeof reason === 'string' ? reason : 'interface'))
  on('photon:shown', logShown)
}
