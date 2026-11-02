// Lecteurs de musique. YT Music, Deezer et SoundCloud : le site dans une fenêtre cachée gardée
// vivante (la musique continue Photon fermé, touches multimédia gérées par Chromium), créée
// seulement si un widget du service existe (≈ 300 Mo de RAM chacune). Spotify : son app Windows
// (src/main/spotify.ts). Cookies de chaque service dans une session à part, jamais lus par Photon
// (sauf la présence du cookie de connexion).
import { app, BrowserWindow, nativeImage, net, session, shell, type WebContents } from 'electron'
import { join } from 'node:path'
import icon from '../../assets/icon.ico?asset'
import { MUSIC_SERVICES } from '../shared/api'
import type {
  MusicCommand,
  MusicQueueItem,
  MusicService,
  MusicState,
  MusicTrack
} from '../shared/api'
import { data } from './data'
import { notify } from './notify'
import {
  openSpotify,
  spotifyArtwork,
  spotifyControl,
  spotifySeek,
  spotifyState,
  spotifyVolume
} from './spotify'
import { isVisible, showWindow } from './window'

type WebService = Exclude<MusicService, 'spotify'>
type Extras = Pick<MusicTrack, 'like' | 'shuffle' | 'repeat'>
type RawTrack = Omit<MusicTrack, 'artwork' | keyof Extras> &
  Partial<Extras> & { artworkUrl: string }

interface WebPlayer {
  home: string
  userAgent: () => string
  hook: boolean // préchargement src/preload/player.ts (API mediaSession de la page)
  login?: { url: string; cookie: string } // cookie posé une fois connecté
  artworkHosts: RegExp
  bigArtwork?: (url: string) => string // même pochette en plus grand
  read: string // → { signedIn, track } | null (page pas prête)
  // Commande absente : le service ne l'offre pas (son bouton est caché, état null).
  commands: Pick<Record<MusicCommand, string>, 'toggle' | 'next' | 'previous'> &
    Partial<Record<MusicCommand, string>>
  seek: (seconds: number) => string
  volume: (percent: number) => string
}

const MAX_ARTWORK_BYTES = 2 * 1024 * 1024
const NOT_READY: MusicState = { ready: false, signedIn: false, track: null }
// Permissions accordées aux sites : lecture protégée et plein écran, rien d'autre
// (ni notifications, ni micro, ni position).
const ALLOWED = new Set(['mediaKeySystem', 'fullscreen'])

// Google refuse la connexion dans Electron, même déguisé en Chrome (il vérifie des signaux propres
// à Chrome) : on se présente comme Firefox. Connexion testée et validée le 1er novembre 2026.
const FIREFOX = (): string =>
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0'
// Les autres : Chrome tel quel, sans les mentions Electron et Photon que certains sites refusent.
const CHROME = (): string => app.userAgentFallback.replace(/ (Electron|Photon)\/\S+/gi, '')

// YT Music : API du lecteur YouTube (#movie_player) quand elle existe ; sinon boutons de la page,
// repérés par les composants partagés de YouTube (like) ou les classes des contrôles (aléatoire,
// répéter), pas par leur texte.
const yt = (code: string): string =>
  `{ const p = document.querySelector('#movie_player'); if (p && p.getPlayerState) ${code} }`

// Lu dans la page : pas d'objet du lecteur → page pas encore prête. Titre et artiste viennent du
// lecteur (pendant une pub, mediaSession décrit la pub) ; la pochette carrée de mediaSession
// seulement si elle décrit bien ce morceau, sinon la miniature de la vidéo. Lecture en cours :
// l'élément <video>, car l'état du lecteur vaut -1 pendant une pub.
const YT_READ = `(() => {
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
      canSeek: true,
      volume: p.getVolume(),
      like: !like ? null : like.getAttribute('aria-pressed') === 'true' ? 'like'
        : dislike?.getAttribute('aria-pressed') === 'true' ? 'dislike' : 'none',
      shuffle: queue ? !!queue.shuffleEnabled : null,
      repeat: queue ? ({ NONE: 'none', ALL: 'all', ONE: 'one' })[queue.repeatMode] ?? null : null
    } : null
  }
})()`

// Deezer, SoundCloud : window.__photon, posé par src/preload/player.ts. extras : lecture en plus
// dans la page (like, aléatoire, répéter), ajoutée au morceau.
const hooked = (extras = '') => ({
  hook: true,
  userAgent: CHROME,
  read: `(() => {
    if (!window.__photon) return null
    const track = window.__photon.state()
    if (track) { ${extras} }
    return { signedIn: true, track }
  })()`,
  seek: (seconds: number) => `window.__photon?.seek(${seconds})`,
  volume: (percent: number) => `window.__photon?.volume(${percent})`
})

const HOOKED_COMMANDS = {
  toggle: 'window.__photon?.toggle()',
  next: 'window.__photon?.next()',
  previous: 'window.__photon?.previous()'
}

// SoundCloud : barre de lecture en bas de page, classes BEM stables depuis des années.
const SC_LIKE = '.playControls .playbackSoundBadge__like'
const SC_SHUFFLE = '.playControls .shuffleControl'
const SC_REPEAT = '.playControls .repeatControl'

const PLAYERS: Record<WebService, WebPlayer> = {
  ytmusic: {
    home: 'https://music.youtube.com/',
    userAgent: FIREFOX,
    hook: false,
    artworkHosts: /\.(googleusercontent|ytimg|ggpht)\.com$/,
    read: YT_READ,
    commands: {
      toggle: yt("p.querySelector('video')?.paused === false ? p.pauseVideo() : p.playVideo()"),
      next: yt('p.nextVideo()'),
      previous: yt('p.previousVideo()'),
      like: yt("document.querySelector('like-button-view-model button')?.click()"),
      dislike: yt("document.querySelector('dislike-button-view-model button')?.click()"),
      shuffle: yt("document.querySelector('.ytmusicPlayerControlsShuffleButton button')?.click()"),
      repeat: yt("document.querySelector('.ytmusicPlayerControlsRepeatButton button')?.click()")
    },
    seek: (seconds) => yt(`p.seekTo(${seconds}, true)`),
    volume: (percent) => yt(`p.setVolume(${percent})`)
  },
  deezer: {
    ...hooked(),
    commands: HOOKED_COMMANDS,
    home: 'https://www.deezer.com/',
    login: { url: 'https://www.deezer.com', cookie: 'arl' },
    artworkHosts: /\.dzcdn\.net$/
  },
  soundcloud: {
    ...hooked(`
      const like = document.querySelector('${SC_LIKE}')
      const shuffle = document.querySelector('${SC_SHUFFLE}')
      const repeat = document.querySelector('${SC_REPEAT}')?.classList
      track.like = like ? (like.classList.contains('sc-button-selected') ? 'like' : 'none') : null
      track.shuffle = shuffle ? shuffle.classList.contains('m-shuffling') : null
      track.repeat = !repeat ? null : repeat.contains('m-one') ? 'one'
        : repeat.contains('m-all') ? 'all' : 'none'`),
    commands: {
      ...HOOKED_COMMANDS,
      like: `document.querySelector('${SC_LIKE}')?.click()`,
      shuffle: `document.querySelector('${SC_SHUFFLE}')?.click()`,
      repeat: `document.querySelector('${SC_REPEAT}')?.click()`
    },
    home: 'https://soundcloud.com/',
    login: { url: 'https://soundcloud.com', cookie: 'oauth_token' },
    artworkHosts: /\.sndcdn\.com$/,
    // La page annonce la vignette 80×80 ; la taille est dans le nom du fichier.
    bigArtwork: (url) => url.replace(/-t\d+x\d+\./, '-t500x500.')
  }
}

interface Player {
  win: BrowserWindow
  // Dernière pochette, en data URL (CSP de Photon : pas d'image distante) ; ready : son téléchargement.
  artwork: { url: string; data: string; ready: Promise<string> }
}

const players = new Map<WebService, Player>()
let quitting = false

const isWeb = (value: unknown): value is WebService =>
  typeof value === 'string' && Object.hasOwn(PLAYERS, value)
const widgetsOf = (service: MusicService) =>
  data.profile.widgets.filter((widget) => widget.type === service)
const wanted = (service: MusicService): boolean => widgetsOf(service).length > 0

// Démarrage et profil enregistré : crée le lecteur au premier widget du service. Jamais détruit
// ensuite (la musique ne doit pas se couper) ; widget retiré = RAM rendue au prochain lancement.
export function syncMusic(): void {
  for (const service of Object.keys(PLAYERS) as WebService[]) {
    if (!players.has(service) && wanted(service)) create(service)
  }
}

function create(service: WebService): void {
  const config = PLAYERS[service]
  const playerSession = session.fromPartition(`persist:${service}`)
  playerSession.setUserAgent(config.userAgent())
  playerSession.setPermissionRequestHandler((_wc, permission, allow) =>
    allow(ALLOWED.has(permission))
  )
  playerSession.setPermissionCheckHandler((_wc, permission) => ALLOWED.has(permission))
  const win = new BrowserWindow({
    show: false,
    width: 1100,
    height: 760,
    title: `${MUSIC_SERVICES[service]} · Photon`,
    icon,
    autoHideMenuBar: true,
    webPreferences: {
      session: playerSession,
      preload: config.hook ? join(__dirname, '../preload/player.js') : undefined,
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      backgroundThrottling: false // sinon la lecture saccade fenêtre cachée
    }
  })
  players.set(service, { win, artwork: { url: '', data: '', ready: Promise.resolve('') } })
  // Fermer = cacher : la musique continue.
  win.on('close', (event) => {
    if (quitting) return
    event.preventDefault()
    win.hide()
  })
  handlePopups(win.webContents)
  win.webContents.on('render-process-gone', (_event, { reason }) => {
    if (reason !== 'clean-exit' && !win.isDestroyed()) win.webContents.reload()
  })
  // Changement de morceau (titre de la page) : pochette préparée en fond, pas à l'ouverture.
  win.on('page-title-updated', () => void onTrack(service))
  void win.loadURL(config.home)
}

// Popup ouverte par script (« Continuer avec Google, Facebook, Apple » : about:blank puis le site
// de connexion) : fenêtre Electron, même session, pour que le résultat revienne à la page.
// En Firefox, sinon Google refuse (voir FIREFOX). Simple lien : navigateur par défaut.
function handlePopups(contents: WebContents): void {
  contents.setWindowOpenHandler(({ url, disposition }) => {
    if (disposition === 'new-window') {
      return { action: 'allow', overrideBrowserWindowOptions: { icon, autoHideMenuBar: true } }
    }
    if (url.startsWith('https://')) void shell.openExternal(url)
    return { action: 'deny' }
  })
  contents.on('did-create-window', (popup) => {
    firefox(popup.webContents)
    handlePopups(popup.webContents)
  })
}

// Bug Electron : une popup ignore setUserAgent (session comme fenêtre) et se présente en Electron.
// L'outil DevTools de Chromium, lui, s'applique (en-tête et navigator.userAgent). Posé pendant
// about:blank ; si le site de connexion a déjà commencé à charger, on le recharge.
function firefox(contents: WebContents): void {
  try {
    contents.debugger.attach()
  } catch {
    return // DevTools déjà ouverts sur la popup
  }
  void contents.debugger
    .sendCommand('Emulation.setUserAgentOverride', { userAgent: FIREFOX() })
    .then(() => {
      if (contents.getURL().startsWith('https://')) contents.reload()
    })
    .catch(() => {})
}

// Spotify n'a pas d'évènement de changement de morceau : relu toutes les 5 s, seulement si une
// de ses notifications est demandée (≈ 5 ms par lecture).
const SPOTIFY_WATCH_MS = 5_000

export function loadMusic(): void {
  app.on('before-quit', () => (quitting = true))
  syncMusic()
  setInterval(() => {
    if (notifyWanted('spotify')) void onTrack('spotify')
  }, SPOTIFY_WATCH_MS)
}

// Interface complète (navigation, connexion) ; Spotify : son app.
export function openMusic(service: unknown): void {
  if (service === 'spotify') return openSpotify()
  const player = isWeb(service) ? players.get(service) : undefined
  if (!player) return
  player.win.show()
  player.win.focus()
}

export async function musicState(service: unknown): Promise<MusicState> {
  if (service === 'spotify') return spotifyState()
  const player = isWeb(service) ? players.get(service) : undefined
  if (!player || player.win.webContents.isLoading()) return NOT_READY
  const config = PLAYERS[service as WebService] // player trouvé : service valide
  const contents = player.win.webContents
  // YT Music : page de consentement aux cookies ou de connexion Google, à faire dans la fenêtre.
  if (!config.hook && !contents.getURL().startsWith(config.home)) {
    return { ready: true, signedIn: false, track: null }
  }
  const raw = (await contents.executeJavaScript(config.read).catch(() => null)) as {
    signedIn: boolean
    track: RawTrack | null
  } | null
  if (!raw) return NOT_READY
  const signedIn = config.login ? await hasCookie(player, config.login) : raw.signedIn
  if (!raw.track) return { ready: true, signedIn, track: null }
  const { artworkUrl, ...track } = raw.track
  const artwork = cover(player, config, config.bigArtwork?.(artworkUrl) ?? artworkUrl)
  return {
    ready: true,
    signedIn,
    track: {
      like: null,
      shuffle: null,
      repeat: null,
      ...track,
      artist: track.artist ?? '',
      artwork
    }
  }
}

const hasCookie = async (
  player: Player,
  login: { url: string; cookie: string }
): Promise<boolean> =>
  (await player.win.webContents.session.cookies.get({ url: login.url, name: login.cookie }))
    .length > 0

// Pochette en cache ; une nouvelle est téléchargée en fond et arrive à la lecture suivante.
function cover(player: Player, config: WebPlayer, url: string): string {
  if (url === player.artwork.url) return player.artwork.data
  const entry = { url, data: '', ready: download(url, config.artworkHosts) }
  player.artwork = entry
  void entry.ready.then((dataUrl) => (entry.data = dataUrl))
  return ''
}

// Notification au changement de morceau : option d'un widget du service dans le profil, Photon
// caché, jamais pour une pub ni pour le premier morceau vu (chargement de la page).
const lastTrack = new Map<MusicService, string>()

const notifyWanted = (service: MusicService): boolean =>
  widgetsOf(service).some((widget) => widget.settings['notify'] === true)

async function onTrack(service: MusicService): Promise<void> {
  const { track } = await musicState(service)
  if (!track || track.artist === 'Publicité') return
  const key = `${track.title}\0${track.artist}`
  const previous = lastTrack.get(service)
  if (key === previous) return
  lastTrack.set(service, key)
  if (previous === undefined || !track.playing || isVisible() || !notifyWanted(service)) return
  const art = await (service === 'spotify'
    ? spotifyArtwork()
    : (players.get(service as WebService)?.artwork.ready ?? ''))
  notify(
    {
      title: track.title,
      body: track.artist,
      silent: true,
      ...(art ? { icon: nativeImage.createFromDataURL(art) } : {})
    },
    () => void showWindow()
  )
}

async function download(raw: string, hosts: RegExp): Promise<string> {
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:' || !hosts.test(url.hostname)) return ''
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

// File d'attente de YT Music lue dans son lecteur (ytmusic-app.queue), pas dans le panneau
// « À suivre » : celui-ci n'est rempli que quand YT Music l'affiche. Un morceau qui a deux
// versions (titre et clip) est enveloppé (playlistPanelVideoWrapperRenderer) : version principale.
// Un titre lancé seul n'a que lui dans la file : la suite est la lecture automatique
// (automixItems, tant qu'elle est activée), qu'on ne peut pas choisir avec selectQueueItem.
const QUEUE = `const q = document.querySelector('ytmusic-app')?.queue
  const state = q?.store?.getState?.()?.queue
  const automix = state?.autoplay ? state.automixItems ?? [] : []
  const video = (it) => it.playlistPanelVideoRenderer
    ?? it.playlistPanelVideoWrapperRenderer?.primaryRenderer?.playlistPanelVideoRenderer ?? {}`

const READ_QUEUE = `(() => {
  ${QUEUE}
  if (!q?.getItems) return []
  const text = (t) => (t?.runs ?? []).map((run) => run.text).join('')
  const at = q.getCurrentItemIndex()
  return [...q.getItems().slice(Math.max(0, at)), ...automix].slice(0, 20).map((it, i) => {
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
  const player = players.get('ytmusic')
  if (!player || player.win.webContents.isLoading()) return []
  const raw = (await player.win.webContents
    .executeJavaScript(READ_QUEUE)
    .catch(() => [])) as unknown
  if (!Array.isArray(raw)) return []
  return (
    (raw as Omit<MusicQueueItem, 'artwork'>[])
      .filter((item) => VIDEO_ID.test(item.id) && typeof item.title === 'string')
      // Un titre à la fois dans la file et la lecture automatique : une seule fois (clé d'affichage).
      .filter((item, i, all) => all.findIndex((other) => other.id === item.id) === i)
      .map((item) => ({ ...item, artwork: thumbnail(item.id) }))
  )
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
  const url = `https://i.ytimg.com/vi/${id}/mqdefault.jpg`
  void download(url, PLAYERS.ytmusic.artworkHosts).then((dataUrl) => {
    if (thumbnails.has(id)) thumbnails.set(id, dataUrl)
  })
  return ''
}

// Identifiant validé : seul ce texte connu est injecté dans la page.
export async function musicPlay(id: unknown): Promise<void> {
  if (typeof id !== 'string' || !VIDEO_ID.test(id)) return
  await run(
    'ytmusic',
    () => `{ ${QUEUE}
    const item = q?.getItems?.().find((it) => video(it).videoId === '${id}')
    const next = automix.find((it) => video(it).videoId === '${id}')
    if (item) q.selectQueueItem(item)
    else if (next) document.querySelector('ytmusic-app').dispatchEvent(new CustomEvent('yt-navigate',
      { detail: { endpoint: video(next).navigationEndpoint }, bubbles: true, composed: true })) }`
  )
}

const COMMANDS = new Set<unknown>([
  'toggle',
  'next',
  'previous',
  'like',
  'dislike',
  'shuffle',
  'repeat'
] satisfies MusicCommand[])

export async function musicControl(service: unknown, command: unknown): Promise<void> {
  if (!COMMANDS.has(command)) return
  if (service === 'spotify') return void (await spotifyControl(command as MusicCommand))
  await run(service, (config) => config.commands[command as MusicCommand])
}

// Nombres seulement, bornés ici : rien d'autre n'est injecté dans la page ni envoyé à l'outil.
export async function musicSeek(service: unknown, seconds: unknown): Promise<void> {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) return
  const value = Math.max(0, seconds)
  if (service === 'spotify') return void (await spotifySeek(value))
  await run(service, (config) => config.seek(value))
}

export async function musicVolume(service: unknown, volume: unknown): Promise<void> {
  if (typeof volume !== 'number' || !Number.isFinite(volume)) return
  const value = Math.round(Math.min(Math.max(volume, 0), 100))
  if (service === 'spotify') return void (await spotifyVolume(value))
  await run(service, (config) => config.volume(value))
}

// userGesture : la page accepte de lancer la lecture sans clic dans sa propre fenêtre.
async function run(
  service: unknown,
  code: (config: WebPlayer) => string | undefined
): Promise<void> {
  const player = isWeb(service) ? players.get(service) : undefined
  const script = player && code(PLAYERS[service as WebService])
  if (!player || !script) return
  await player.win.webContents.executeJavaScript(script, true).catch(() => undefined)
}

// Services présents : lecteur créé, ou widget Spotify dans le profil (barre de commande).
export const musicAvailable = (service: MusicService): boolean =>
  service === 'spotify' ? wanted('spotify') : players.has(service)

// Service visé par la barre de commande : celui qui joue, sinon le premier présent.
export async function currentMusic(): Promise<MusicService | null> {
  const present = (Object.keys(MUSIC_SERVICES) as MusicService[]).filter(musicAvailable)
  for (const service of present) {
    if ((await musicState(service)).track?.playing) return service
  }
  return present[0] ?? null
}
