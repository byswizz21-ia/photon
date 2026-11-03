// Côté Windows du pont : un canal par fonction de window.photon, entrées validées ici.
import { clipboard, ipcMain, shell, type IpcMainEvent, type IpcMainInvokeEvent } from 'electron'
import type { AppState } from '../shared/api'
import type { Settings } from '../shared/model'
import {
  audio,
  audioAppIcon,
  audioApps,
  audioAppVolume,
  audioDevice,
  audioMute,
  audioVolume
} from './audio'
import { awake, awakeStart, awakeStop, syncAwake } from './awake'
import { eyes, eyesSet, syncEyes } from './eyes'
import { notifyTest } from './notify'
import { setToastLook } from './toast'
import { pickColor } from './colorpicker'
import { portClose, ports } from './ports'
import { shutdownCancel, shutdownStart, shutdownState, syncShutdown } from './shutdown'
import { importFile, pickFile } from './background'
import { importUrl } from './download'
import { batteries } from './batteries'
import { calendar, onProfileSaved } from './calendar'
import {
  answerApproval,
  ask,
  claudeState,
  newConversation,
  openConversation,
  saveImage,
  setMode,
  stopAnswer,
  validFiles
} from './claude'
import { clipboardClear, clipboardHistory, syncClipboard } from './clipboard'
import { gitOpen, gitStatus } from './git'
import { createProfile, data, deleteProfile, saveProfile, saveTheme, switchProfile } from './data'
import { markets, onMarketsProfile } from './markets'
import { news, onNewsProfile, openNews } from './news'
import { chessPuzzle, onChessProfile } from './chess'
import {
  musicControl,
  musicPlay,
  musicQueue,
  musicSeek,
  musicState,
  musicVolume,
  openMusic,
  syncMusic
} from './music'
import { lyrics } from './lyrics'
import { pomodoro, pomodoroControl } from './pomodoro'
import { processClose, processes, processIcon } from './processes'
import { recentFiles } from './search/files'
import { openResult, resultIcon, search } from './search/search'
import { sharedLoad, sharedSave } from './shared'
import { cpuRam, disks, fileIcon, launch, network, pickApps, pickFolders } from './system'
import { temperatures } from './temperatures'
import { displayList } from './screens'
import { syncFocus } from './focus'
import { pickAutoApps } from './auto'
import { claudeUsage } from './usage'
import { onWeatherProfile, weather } from './weather'
import { hideWindow, logShown, ownsSender, resizeBar, setIntro } from './window'
import { syncFeeds } from './feeds'
import { freeGames } from './freegames'
import { twitch, twitchLogin, twitchLogout } from './twitch'
import { footTeams, matches } from './matches'
import { releases } from './releases'
import { screenshotCopy, screenshotDelete, screenshotDrag, screenshots } from './screenshots'
import { scriptStart, scripts, scriptStop } from './scripts'
import { transit, transitLines, transitStops } from './transit'
import { translate } from './translate'
import { trash, trashEmpty, trashOpen } from './trash'
import { httpsHref } from './web'

interface IpcActions {
  ready: () => void
  updateSettings: (patch: Partial<Settings>) => Promise<Settings>
}

const MAX_TEXT = 100_000 // caractères : question, presse-papier

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

// Réglages modifiables depuis l'interface. Profil actif : seulement par switchProfile (il
// recharge profil et thème), sinon l'interface écraserait le nouveau profil avec l'ancien.
const EDITABLE: readonly string[] = [
  'shortcut',
  'barShortcut',
  'mode',
  'alwaysOnTop',
  'screen',
  'reduceMotion',
  'autoProfiles',
  'liveBlur',
  'sound',
  'notifications',
  'introSeen'
]

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
    void syncFocus(data.profile.focus) // option Focus cochée ou décochée
    onProfileSaved()
    onWeatherProfile()
    onMarketsProfile()
    onNewsProfile()
    onChessProfile()
    syncClipboard()
    syncMusic()
    syncEyes()
    syncAwake()
    syncShutdown()
    syncFeeds()
  })
  // Profil changé : agendas et lecteurs de musique suivent les widgets du nouveau profil.
  const switched = (ok: boolean): AppState | null => {
    if (!ok) return null
    void syncFocus(data.profile.focus)
    onProfileSaved()
    onWeatherProfile()
    onMarketsProfile()
    onNewsProfile()
    onChessProfile()
    syncClipboard()
    syncMusic()
    syncEyes()
    syncAwake()
    syncShutdown()
    syncFeeds()
    return { ...data }
  }
  handle('photon:switchProfile', async (id) => switched(await switchProfile(id)))
  handle('photon:createProfile', async (source) => switched(await createProfile(source)))
  handle('photon:deleteProfile', async () => switched(await deleteProfile()))
  on('photon:hide', (reason) => hideWindow(typeof reason === 'string' ? reason : 'interface'))
  on('photon:shown', logShown)
  on('photon:intro', (playing) => setIntro(playing === true))
  handle('photon:cpuRam', cpuRam)
  handle('photon:temperatures', temperatures)
  handle('photon:displays', displayList)
  handle('photon:disks', disks)
  handle('photon:fileIcon', (path) => (typeof path === 'string' ? fileIcon(path) : null))
  // Lancer une app depuis Photon le cache, seulement si Windows a pu l'ouvrir.
  handle('photon:launch', async (path) => {
    const launched = typeof path === 'string' && (await launch(path))
    if (launched) hideWindow('app lancée')
    return launched
  })
  handle('photon:pickApps', pickApps)
  handle('photon:pickAutoApps', pickAutoApps)
  handle('photon:calendar', calendar)
  handle('photon:claudeState', claudeState)
  handle('photon:claudeAsk', (text, files) =>
    typeof text === 'string' && text.length <= MAX_TEXT ? ask(text, validFiles(files)) : false
  )
  on('photon:claudeStop', stopAnswer)
  on('photon:claudeNew', newConversation)
  on('photon:claudeOpen', openConversation)
  on('photon:claudeMode', setMode) // validés dans claude.ts
  on('photon:claudeApprove', answerApproval)
  handle('photon:claudeImage', saveImage) // PNG vérifié, 10 Mo au plus
  handle('photon:clipboardText', async () => (await clipboard.readText()).slice(0, MAX_TEXT))
  on('photon:copyText', (text) => {
    if (typeof text === 'string') void clipboard.writeText(text.slice(0, MAX_TEXT))
  })
  handle('photon:music', musicState)
  handle('photon:musicControl', musicControl) // services, commandes, nombres : validés dans music.ts
  handle('photon:musicSeek', musicSeek)
  handle('photon:musicVolume', musicVolume)
  handle('photon:musicQueue', musicQueue)
  handle('photon:musicPlay', musicPlay) // identifiant YouTube validé dans music.ts
  handle('photon:musicLyrics', lyrics) // textes bornés dans lyrics.ts
  on('photon:musicOpen', (service) => {
    hideWindow('lecteur de musique ouvert')
    openMusic(service) // service validé dans music.ts
  })
  handle('photon:search', search) // texte borné, résultats gardés côté Windows
  handle('photon:openResult', async (id, inFolder) => {
    const opened = await openResult(id, inFolder)
    if (opened) hideWindow('barre de commande')
    return opened
  })
  handle('photon:resultIcon', resultIcon)
  on('photon:barResize', (height) => {
    if (typeof height === 'number' && Number.isFinite(height)) resizeBar(height)
  })
  handle('photon:pickFile', pickFile)
  handle('photon:importFile', importFile) // type, extension et taille vérifiés dans background.ts
  handle('photon:importUrl', importUrl) // https seulement, type et taille vérifiés (download.ts)
  handle('photon:sharedLoad', sharedLoad) // clé = nom de fichier validé, taille bornée
  handle('photon:sharedSave', sharedSave)
  handle('photon:pomodoro', pomodoro)
  handle('photon:pomodoroControl', pomodoroControl) // commande et durées validées
  handle('photon:weather', weather)
  handle('photon:network', network)
  handle('photon:recentFiles', () =>
    recentFiles(12).map(({ path, name, folder }) => ({ path, name, folder }))
  )
  handle('photon:pickFolders', pickFolders)
  handle('photon:audio', audio)
  handle('photon:audioVolume', audioVolume) // valeurs validées dans audio.ts
  handle('photon:audioMute', audioMute)
  handle('photon:audioDevice', audioDevice)
  handle('photon:audioApps', audioApps)
  handle('photon:audioAppVolume', audioAppVolume)
  handle('photon:audioAppIcon', audioAppIcon)
  handle('photon:claudeUsage', claudeUsage)
  handle('photon:clipboardHistory', clipboardHistory)
  on('photon:clipboardClear', clipboardClear)
  handle('photon:batteries', batteries)
  handle('photon:markets', markets) // symboles validés dans markets.ts
  handle('photon:news', news) // sujets validés dans news.ts
  handle('photon:newsOpen', async (link) => {
    const opened = await openNews(link) // seulement un lien d'un flux déjà lu
    if (opened) hideWindow('article ouvert')
    return opened
  })
  handle('photon:chessPuzzle', chessPuzzle)
  handle('photon:processes', processes) // nom validé contre la dernière lecture, jamais un pid
  handle('photon:processIcon', processIcon)
  handle('photon:processClose', processClose)
  handle('photon:gitStatus', gitStatus) // chemins absolus locaux seulement
  handle('photon:gitOpen', async (path) => {
    const opened = await gitOpen(path)
    if (opened) hideWindow('VS Code ouvert')
    return opened
  })
  handle('photon:awake', awake)
  handle('photon:awakeStart', awakeStart) // durée et choix de l'écran validés dans awake.ts
  handle('photon:awakeStop', awakeStop)
  handle('photon:eyes', eyes)
  handle('photon:eyesSet', eyesSet) // validé dans eyes.ts
  handle('photon:ports', ports)
  handle('photon:portClose', portClose) // pid validé contre la dernière lecture
  handle('photon:shutdownState', shutdownState)
  handle('photon:shutdownStart', shutdownStart) // action et durée validées dans shutdown.ts
  handle('photon:shutdownCancel', shutdownCancel)
  handle('photon:pickColor', pickColor)
  on('photon:notifyTest', notifyTest)
  // Widgets du 2026-11-03
  on('photon:openUrl', (url) => {
    const href = httpsHref(url)
    if (!href) return
    hideWindow('lien ouvert')
    void shell.openExternal(href)
  })
  handle('photon:trash', trash)
  handle('photon:trashEmpty', trashEmpty)
  on('photon:trashOpen', () => {
    hideWindow('corbeille ouverte')
    trashOpen()
  })
  handle('photon:screenshots', screenshots) // dossier absolu, sinon celui de Windows
  // Glisser : il faut l'expéditeur (startDrag), d'où ipcMain direct.
  ipcMain.on('photon:screenshotDrag', (event, path) => {
    if (ownsSender(event.sender)) screenshotDrag(event.sender, path)
  })
  handle('photon:screenshotCopy', screenshotCopy) // seulement les fichiers de la dernière liste
  handle('photon:screenshotDelete', screenshotDelete)
  handle('photon:scripts', scripts)
  handle('photon:scriptStart', scriptStart) // id, dossier existant et commande validés
  handle('photon:scriptStop', scriptStop)
  handle('photon:translate', translate) // texte borné, langue validée
  handle('photon:transitLines', transitLines)
  handle('photon:transitStops', transitStops) // identifiant de ligne validé
  handle('photon:footTeams', footTeams) // ligue validée
  handle('photon:freeGames', freeGames)
  handle('photon:transit', transit)
  handle('photon:matches', matches)
  handle('photon:releases', releases)
  handle('photon:twitch', twitch)
  on('photon:twitchLogin', () => {
    hideWindow('connexion Twitch')
    twitchLogin()
  })
  handle('photon:twitchLogout', twitchLogout)
  on('photon:toastLook', setToastLook)
}
