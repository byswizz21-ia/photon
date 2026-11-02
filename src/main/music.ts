// YT Music : music.youtube.com dans une fenêtre cachée gardée vivante (la musique continue Photon
// fermé, touches multimédia gérées par Chromium). Créée seulement si un widget YT Music existe
// (≈ 300 Mo de RAM). Le widget la pilote par l'API du lecteur YouTube (#movie_player) de la page.
// Cookies Google dans une session à part, jamais lus par Photon.
import { app, BrowserWindow, nativeImage, net, Notification, session, shell } from 'electron'
import icon from '../../assets/icon.ico?asset'
import type { MusicCommand, MusicQueueItem, MusicState, MusicTrack } from '../shared/api'
import { data } from './data'
import { isVisible, showWindow } from './window'

const HOME = 'https://music.youtube.com/'
const PARTITION = 'persist:ytmusic'
const MAX_ARTWORK_BYTES = 2 * 1024 * 1024
const ARTWORK_HOSTS = /\.(googleusercontent|ytimg|ggpht)\.com$/

let player: BrowserWindow | null = null
let quitting = false
// Dernière pochette, en data URL (CSP de Photon : pas d'image distante) ; ready : son téléchargement.
let artwork = { url: '', data: '', ready: Promise.resolve('') }

// Google refuse la connexion dans Electron, même déguisé en Chrome (il vérifie des signaux propres
// à Chrome) : on se présente comme Firefox. Connexion testée et validée le 1er novembre 2026.
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0'

const wanted = (): boolean => data.profile.widgets.some((widget) => widget.type === 'ytmusic')

// Démarrage et profil enregistré : crée le lecteur au premier widget YT Music. Jamais détruit
// ensuite (la musique ne doit pas se couper) ; widget retiré = RAM rendue au prochain lancement.
export function syncMusic(): void {
  if (player || !wanted()) return
  const ytSession = session.fromPartition(PARTITION)
  ytSession.setUserAgent(USER_AGENT)
  player = new BrowserWindow({
    show: false,
    width: 1100,
    height: 760,
    title: 'YT Music · Photon',
    icon,
    autoHideMenuBar: true,
    webPreferences: {
      session: ytSession,
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      backgroundThrottling: false // sinon la lecture saccade fenêtre cachée
    }
  })
  const win = player
  // Fermer = cacher : la musique continue.
  win.on('close', (event) => {
    if (quitting) return
    event.preventDefault()
    win.hide()
  })
  // Liens hors YT Music / Google : navigateur par défaut.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('render-process-gone', (_event, { reason }) => {
    if (reason !== 'clean-exit' && !win.isDestroyed()) win.webContents.reload()
  })
  // Changement de morceau (titre de la page) : pochette préparée en fond, pas à l'ouverture.
  win.on('page-title-updated', () => void onTitle())
  void win.loadURL(HOME)
}

export function loadMusic(): void {
  app.on('before-quit', () => (quitting = true))
  syncMusic()
}

// Interface complète (navigation, connexion Google).
export function openMusic(): void {
  if (!player) return
  player.show()
  player.focus()
}

// Lu dans la page : pas d'objet du lecteur → page pas encore prête. Titre et artiste viennent du
// lecteur (pendant une pub, mediaSession décrit la pub) ; la pochette carrée de mediaSession
// seulement si elle décrit bien ce morceau, sinon la miniature de la vidéo. Lecture en cours :
// l'élément <video>, car l'état du lecteur vaut -1 pendant une pub.
const READ_STATE = `(() => {
  const p = document.querySelector('#movie_player')
  if (!p || !p.getPlayerState) return null
  const video = p.getVideoData()
  const m = navigator.mediaSession.metadata
  const same = m && m.title === video.title && m.artwork.length
  const v = p.querySelector('video')
  const ad = p.classList.contains('ad-showing')
  const like = document.querySelector('like-button-view-model button')
  const dislike = document.querySelector('dislike-button-view-model button')
  const queue = document.querySelector('ytmusic-app')?.queue?.store?.getState?.()?.queue
  return {
    signedIn: !document.querySelector('ytmusic-nav-bar .sign-in-link'),
    track: video.video_id ? {
      title: video.title,
      artist: ad ? 'Publicité' : same ? m.artist : video.author,
      artworkUrl: same ? m.artwork[m.artwork.length - 1].src
        : 'https://i.ytimg.com/vi/' + encodeURIComponent(video.video_id) + '/hqdefault.jpg',
      playing: !!v && !v.paused,
      time: p.getCurrentTime(),
      duration: p.getDuration(),
      volume: p.getVolume(),
      like: !like ? null : like.getAttribute('aria-pressed') === 'true' ? 'like'
        : dislike?.getAttribute('aria-pressed') === 'true' ? 'dislike' : 'none',
      shuffle: queue ? !!queue.shuffleEnabled : null,
      repeat: queue ? ({ NONE: 'none', ALL: 'all', ONE: 'one' })[queue.repeatMode] ?? null : null
    } : null
  }
})()`

type RawTrack = Omit<MusicTrack, 'artwork'> & { artworkUrl: string }

export async function musicState(): Promise<MusicState> {
  if (!player) return { ready: false, signedIn: false, track: null }
  if (player.webContents.isLoading()) return { ready: false, signedIn: false, track: null }
  // Page de consentement aux cookies ou de connexion Google : à faire dans la fenêtre.
  if (!player.webContents.getURL().startsWith(HOME)) {
    return { ready: true, signedIn: false, track: null }
  }
  const raw = (await player.webContents.executeJavaScript(READ_STATE).catch(() => null)) as {
    signedIn: boolean
    track: RawTrack | null
  } | null
  if (!raw) return { ready: false, signedIn: false, track: null }
  if (!raw.track) return { ready: true, signedIn: raw.signedIn, track: null }
  const { artworkUrl, ...track } = raw.track
  return { ready: true, signedIn: raw.signedIn, track: { ...track, artwork: cover(artworkUrl) } }
}

// Pochette en cache ; une nouvelle est téléchargée en fond et arrive à la lecture suivante.
function cover(url: string): string {
  if (url === artwork.url) return artwork.data
  const entry = { url, data: '', ready: download(url) }
  artwork = entry
  void entry.ready.then((dataUrl) => (entry.data = dataUrl))
  return ''
}

// Notification au changement de morceau : option d'un widget YT Music du profil, Photon caché,
// jamais pour une pub ni pour le premier morceau vu (chargement de la page).
let lastTrack = ''

const notifyWanted = (): boolean =>
  data.profile.widgets.some((w) => w.type === 'ytmusic' && w.settings['notify'] === true)

async function onTitle(): Promise<void> {
  const { track } = await musicState()
  if (!track || track.artist === 'Publicité') return
  const key = `${track.title}\0${track.artist}`
  if (key === lastTrack) return
  const first = lastTrack === ''
  lastTrack = key
  if (first || !track.playing || isVisible() || !notifyWanted() || !Notification.isSupported()) {
    return
  }
  const art = await artwork.ready
  const notification = new Notification({
    title: track.title,
    body: track.artist,
    silent: true,
    ...(art ? { icon: nativeImage.createFromDataURL(art) } : {})
  })
  notification.on('click', () => void showWindow())
  notification.show()
}

async function download(raw: string): Promise<string> {
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:' || !ARTWORK_HOSTS.test(url.hostname)) return ''
    const response = await net.fetch(url.href, { signal: AbortSignal.timeout(10_000) })
    const type = response.headers.get('content-type') ?? ''
    if (!response.ok || !type.startsWith('image/')) return ''
    const bytes = Buffer.from(await response.arrayBuffer())
    if (bytes.length > MAX_ARTWORK_BYTES) return ''
    return `data:${type};base64,${bytes.toString('base64')}`
  } catch {
    return ''
  }
}

// API du lecteur YouTube quand elle existe ; sinon boutons de la page, repérés par les composants
// partagés de YouTube (like) ou les classes des contrôles (aléatoire, répéter), pas par leur texte.
const COMMANDS: Record<MusicCommand, string> = {
  toggle: "p.querySelector('video')?.paused === false ? p.pauseVideo() : p.playVideo()",
  next: 'p.nextVideo()',
  previous: 'p.previousVideo()',
  like: "document.querySelector('like-button-view-model button')?.click()",
  dislike: "document.querySelector('dislike-button-view-model button')?.click()",
  shuffle: "document.querySelector('.ytmusicPlayerControlsShuffleButton button')?.click()",
  repeat: "document.querySelector('.ytmusicPlayerControlsRepeatButton button')?.click()"
}

// File d'attente lue dans le lecteur de YT Music (ytmusic-app.queue), pas dans le panneau
// « À suivre » : celui-ci n'est rempli que quand YT Music l'affiche. Un morceau qui a deux
// versions (titre et clip) est enveloppé (playlistPanelVideoWrapperRenderer) : version principale.
const QUEUE = `const q = document.querySelector('ytmusic-app')?.queue
  const video = (it) => it.playlistPanelVideoRenderer
    ?? it.playlistPanelVideoWrapperRenderer?.primaryRenderer?.playlistPanelVideoRenderer ?? {}`

const READ_QUEUE = `(() => {
  ${QUEUE}
  if (!q?.getItems) return []
  const text = (t) => (t?.runs ?? []).map((run) => run.text).join('')
  const at = q.getCurrentItemIndex()
  return q.getItems().slice(Math.max(0, at), Math.max(0, at) + 20).map((it, i) => {
    const v = video(it)
    return {
      id: v.videoId ?? '',
      title: text(v.title),
      artist: text(v.shortBylineText),
      duration: text(v.lengthText),
      current: i === 0 && at >= 0
    }
  })
})()`

const VIDEO_ID = /^[\w-]{11}$/

export async function musicQueue(): Promise<MusicQueueItem[]> {
  if (!player || player.webContents.isLoading()) return []
  const raw = (await player.webContents.executeJavaScript(READ_QUEUE).catch(() => [])) as unknown
  if (!Array.isArray(raw)) return []
  return (raw as Omit<MusicQueueItem, 'artwork'>[])
    .filter((item) => VIDEO_ID.test(item.id) && typeof item.title === 'string')
    .map((item) => ({ ...item, artwork: thumbnail(item.id) }))
}

// Miniatures de la file : téléchargées une fois en fond, gardées pour les 80 dernières.
const MAX_THUMBNAILS = 80
const thumbnails = new Map<string, string>()

function thumbnail(id: string): string {
  const known = thumbnails.get(id)
  if (known !== undefined) return known
  const oldest = thumbnails.keys().next()
  if (thumbnails.size >= MAX_THUMBNAILS && !oldest.done) thumbnails.delete(oldest.value)
  thumbnails.set(id, '')
  void download(`https://i.ytimg.com/vi/${id}/mqdefault.jpg`).then((dataUrl) => {
    if (thumbnails.has(id)) thumbnails.set(id, dataUrl)
  })
  return ''
}

// Identifiant validé : seul ce texte connu est injecté dans la page.
export async function musicPlay(id: unknown): Promise<void> {
  if (typeof id !== 'string' || !VIDEO_ID.test(id)) return
  await run(
    `{ ${QUEUE}
    const item = q?.getItems?.().find((it) => video(it).videoId === '${id}')
    if (item) q.selectQueueItem(item) }`
  )
}

export async function musicControl(command: unknown): Promise<void> {
  if (typeof command !== 'string' || !Object.hasOwn(COMMANDS, command)) return
  await run(COMMANDS[command as MusicCommand])
}

// Nombres seulement, bornés ici : rien d'autre n'est injecté dans la page.
export async function musicSeek(seconds: unknown): Promise<void> {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) return
  await run(`p.seekTo(${Math.max(0, seconds)}, true)`)
}

export async function musicVolume(volume: unknown): Promise<void> {
  if (typeof volume !== 'number' || !Number.isFinite(volume)) return
  const value = Math.round(Math.min(Math.max(volume, 0), 100))
  await run(`p.setVolume(${value})`)
}

// userGesture : la page accepte de lancer la lecture sans clic dans sa propre fenêtre.
async function run(code: string): Promise<void> {
  const script = `{ const p = document.querySelector('#movie_player'); if (p && p.getPlayerState) ${code} }`
  await player?.webContents.executeJavaScript(script, true).catch(() => undefined)
}

export const musicAvailable = (): boolean => player !== null
