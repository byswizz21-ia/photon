// Pont de la fenêtre des notifications (src/main/toast.ts) : window.toasts, rien d'autre.
import { contextBridge, ipcRenderer } from 'electron'
import type { ToastApi } from '../shared/api'

function listen<T>(channel: string) {
  return (callback: (payload: T) => void): (() => void) => {
    const listener = (_event: unknown, payload: T): void => callback(payload)
    ipcRenderer.on(channel, listener)
    return () => ipcRenderer.removeListener(channel, listener)
  }
}

const toasts: ToastApi = {
  onShow: listen('toast:show'),
  onLook: listen('toast:look'),
  click: (id, action) => ipcRenderer.send('toast:click', id, action),
  close: (id) => ipcRenderer.send('toast:close', id),
  hover: (inside) => ipcRenderer.send('toast:hover', inside),
  empty: () => ipcRenderer.send('toast:empty')
}

contextBridge.exposeInMainWorld('toasts', toasts)
