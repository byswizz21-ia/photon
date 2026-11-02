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
  onSwitchTo: listen('photon:switchTo'),
  onPlace: listen('photon:place'),
  cpuRam: () => ipcRenderer.invoke('photon:cpuRam'),
  temperatures: () => ipcRenderer.invoke('photon:temperatures'),
  displays: () => ipcRenderer.invoke('photon:displays'),
  disks: () => ipcRenderer.invoke('photon:disks'),
  fileIcon: (path) => ipcRenderer.invoke('photon:fileIcon', path),
  launch: (path) => ipcRenderer.invoke('photon:launch', path),
  pickApps: () => ipcRenderer.invoke('photon:pickApps'),
  pickAutoApps: () => ipcRenderer.invoke('photon:pickAutoApps'),
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
  music: (service) => ipcRenderer.invoke('photon:music', service),
  musicControl: (service, command) => ipcRenderer.invoke('photon:musicControl', service, command),
  musicSeek: (service, seconds) => ipcRenderer.invoke('photon:musicSeek', service, seconds),
  musicVolume: (service, volume) => ipcRenderer.invoke('photon:musicVolume', service, volume),
  musicOpen: (service) => ipcRenderer.send('photon:musicOpen', service),
  musicQueue: () => ipcRenderer.invoke('photon:musicQueue'),
  musicPlay: (id) => ipcRenderer.invoke('photon:musicPlay', id),
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
  processes: (sort) => ipcRenderer.invoke('photon:processes', sort),
  processIcon: (name) => ipcRenderer.invoke('photon:processIcon', name),
  processClose: (name) => ipcRenderer.invoke('photon:processClose', name),
  gitStatus: (paths) => ipcRenderer.invoke('photon:gitStatus', paths),
  gitOpen: (path) => ipcRenderer.invoke('photon:gitOpen', path),
  awake: () => ipcRenderer.invoke('photon:awake'),
  awakeStart: (minutes, screen) => ipcRenderer.invoke('photon:awakeStart', minutes, screen),
  awakeStop: () => ipcRenderer.invoke('photon:awakeStop'),
  eyes: () => ipcRenderer.invoke('photon:eyes'),
  eyesSet: (on, minutes) => ipcRenderer.invoke('photon:eyesSet', on, minutes),
  pickFile: (kind) => ipcRenderer.invoke('photon:pickFile', kind),
  importFile: (kind, path) => ipcRenderer.invoke('photon:importFile', kind, path),
  importUrl: (url) => ipcRenderer.invoke('photon:importUrl', url)
}

contextBridge.exposeInMainWorld('photon', photon)
