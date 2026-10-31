// Pont sécurisé : expose window.photon à l'interface, rien d'autre.
import { contextBridge, ipcRenderer } from 'electron'
import type { PhotonApi } from '../shared/api'

function listen(channel: string) {
  return (callback: () => void): (() => void) => {
    const listener = (): void => callback()
    ipcRenderer.on(channel, listener)
    return () => ipcRenderer.removeListener(channel, listener)
  }
}

const photon: PhotonApi = {
  hide: () => ipcRenderer.send('photon:hide'),
  shown: () => ipcRenderer.send('photon:shown'),
  onShow: listen('photon:show'),
  onHide: listen('photon:hide')
}

contextBridge.exposeInMainWorld('photon', photon)
