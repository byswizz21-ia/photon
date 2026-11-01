// Pont sécurisé : expose window.photon à l'interface, rien d'autre.
import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type { PhotonApi } from '../shared/api'

function listen<T>(channel: string) {
  return (callback: (payload: T) => void): (() => void) => {
    const listener = (_event: unknown, payload: T): void => callback(payload)
    ipcRenderer.on(channel, listener)
    return () => ipcRenderer.removeListener(channel, listener)
  }
}

const photon: PhotonApi = {
  load: () => ipcRenderer.invoke('photon:load'),
  ready: () => ipcRenderer.send('photon:ready'),
  saveSettings: (patch) => ipcRenderer.invoke('photon:saveSettings', patch),
  saveTheme: (theme) => ipcRenderer.invoke('photon:saveTheme', theme),
  saveProfile: (profile) => ipcRenderer.invoke('photon:saveProfile', profile),
  switchProfile: (id) => ipcRenderer.invoke('photon:switchProfile', id),
  createProfile: (source) => ipcRenderer.invoke('photon:createProfile', source),
  deleteProfile: () => ipcRenderer.invoke('photon:deleteProfile'),
  hide: (reason) => ipcRenderer.send('photon:hide', reason),
  shown: () => ipcRenderer.send('photon:shown'),
  onShow: listen('photon:show'),
  onHide: listen('photon:hide'),
  onSettings: listen('photon:settings'),
  cpuRam: () => ipcRenderer.invoke('photon:cpuRam'),
  temperatures: () => ipcRenderer.invoke('photon:temperatures'),
  displays: () => ipcRenderer.invoke('photon:displays'),
  disks: () => ipcRenderer.invoke('photon:disks'),
  fileIcon: (path) => ipcRenderer.invoke('photon:fileIcon', path),
  launch: (path) => ipcRenderer.invoke('photon:launch', path),
  pickApps: () => ipcRenderer.invoke('photon:pickApps'),
  pathForFile: (file) => webUtils.getPathForFile(file),
  calendar: (url) => ipcRenderer.invoke('photon:calendar', url),
  claudeState: () => ipcRenderer.invoke('photon:claudeState'),
  onClaude: listen('photon:claude'),
  claudeAsk: (text, files) => ipcRenderer.invoke('photon:claudeAsk', text, files),
  claudeStop: () => ipcRenderer.send('photon:claudeStop'),
  claudeNew: () => ipcRenderer.send('photon:claudeNew'),
  claudeOpen: (id) => ipcRenderer.send('photon:claudeOpen', id),
  claudeMode: (mode) => ipcRenderer.send('photon:claudeMode', mode),
  claudeApprove: (id, allow) => ipcRenderer.send('photon:claudeApprove', id, allow),
  claudeImage: (png) => ipcRenderer.invoke('photon:claudeImage', png),
  clipboardText: () => ipcRenderer.invoke('photon:clipboardText'),
  copyText: (text) => ipcRenderer.send('photon:copyText', text),
  music: () => ipcRenderer.invoke('photon:music'),
  musicControl: (command) => ipcRenderer.invoke('photon:musicControl', command),
  musicSeek: (seconds) => ipcRenderer.invoke('photon:musicSeek', seconds),
  musicVolume: (volume) => ipcRenderer.invoke('photon:musicVolume', volume),
  musicOpen: () => ipcRenderer.send('photon:musicOpen'),
  search: (query) => ipcRenderer.invoke('photon:search', query),
  openResult: (id, inFolder) => ipcRenderer.invoke('photon:openResult', id, inFolder),
  resultIcon: (id) => ipcRenderer.invoke('photon:resultIcon', id),
  barResize: (height) => ipcRenderer.send('photon:barResize', height),
  sharedLoad: (key) => ipcRenderer.invoke('photon:sharedLoad', key),
  sharedSave: (key, value) => ipcRenderer.invoke('photon:sharedSave', key, value),
  pomodoro: () => ipcRenderer.invoke('photon:pomodoro'),
  pomodoroControl: (command, focus, pause) =>
    ipcRenderer.invoke('photon:pomodoroControl', command, focus, pause),
  weather: (city) => ipcRenderer.invoke('photon:weather', city),
  network: () => ipcRenderer.invoke('photon:network'),
  recentFiles: () => ipcRenderer.invoke('photon:recentFiles'),
  pickFolders: () => ipcRenderer.invoke('photon:pickFolders'),
  audio: () => ipcRenderer.invoke('photon:audio'),
  audioVolume: (volume) => ipcRenderer.invoke('photon:audioVolume', volume),
  audioMute: (muted) => ipcRenderer.invoke('photon:audioMute', muted),
  audioDevice: (id) => ipcRenderer.invoke('photon:audioDevice', id),
  claudeUsage: () => ipcRenderer.invoke('photon:claudeUsage'),
  clipboardHistory: () => ipcRenderer.invoke('photon:clipboardHistory'),
  clipboardClear: () => ipcRenderer.send('photon:clipboardClear'),
  batteries: () => ipcRenderer.invoke('photon:batteries'),
  markets: (symbols) => ipcRenderer.invoke('photon:markets', symbols),
  pickImage: () => ipcRenderer.invoke('photon:pickImage')
}

contextBridge.exposeInMainWorld('photon', photon)
