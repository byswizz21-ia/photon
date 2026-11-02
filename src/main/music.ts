// Lecteurs de musique. YT Music, Deezer et SoundCloud : le site dans une fenêtre cachée gardée
// vivante (la musique continue Photon fermé, touches multimédia gérées par Chromium), créée
// seulement si un widget du service existe (≈ 300 Mo de RAM chacune). Spotify : son app Windows
// (src/main/spotify.ts). Cookies de chaque service dans une session à part, jamais lus par Photon
// (sauf la présence du cookie de connexion).
import { app, BrowserWindow, net, session, shell } from 'electron'
import { join } from 'node:path'
import icon from '../../assets/icon.ico?asset'
import { MUSIC_SERVICES } from '../shared/api'
import type { MusicCommand, MusicService, MusicState, MusicTrack } from '../shared/api'
import { data } from './data'
import { openSpotify, spotifyControl, spotifySeek, spotifyState, spotifyVolume } from './spotify'

type WebService = Exclude<MusicService, 'spotify'>
type RawTrack = Omit<MusicTrack, 'artwork'> & { artworkUrl: string }

interface WebPlayer {
  home: string
  userAgent: () => string
  hook: boolean // préchargement src/preload/player.ts (API mediaSession de la page)
  login?: { url: string; cookie: string } // cookie posé une fois connecté
  artworkHosts: RegExp
  bigArtwork?: (url: string) => string // même pochette en plus grand
  read: string // → { signedIn, track } | null (page pas prête)
  commands: Record<MusicCommand, string>
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

// YT Music : API du lecteur YouTube (#movie_player), stable contrairement aux boutons de la page.
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
      volume: p.getVolume()
    } : null
  }
})()`

// Deezer, SoundCloud : window.__photon, posé par src/preload/player.ts.
const HOOKED = {
  hook: true,
  userAgent: CHROME,
  read: '(() => window.__photon ? { signedIn: true, track: window.__photon.state() } : null)()',
  commands: {
    toggle: 'window.__photon?.toggle()',
    next: 'window.__photon?.next()',
    previous: 'window.__photon?.previous()'
  },
  seek: (seconds: number) => `window.__photon?.seek(${seconds})`,
  volume: (percent: number) => `window.__photon?.volume(${percent})`
}

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
      previous: yt('p.previousVideo()')
    },
    seek: (seconds) => yt(`p.seekTo(${seconds}, true)`),
    volume: (percent) => yt(`p.setVolume(${percent})`)
  },
  deezer: {
    ...HOOKED,
    home: 'https://www.deezer.com/',
    login: { url: 'https://www.deezer.com', cookie: 'arl' },
    artworkHosts: /\.dzcdn\.net$/
  },
  soundcloud: {
    ...HOOKED,
    home: 'https://soundcloud.com/',
    login: { url: 'https://soundcloud.com', cookie: 'oauth_token' },
    artworkHosts: /\.sndcdn\.com$/,
    // La page annonce la vignette 80×80 ; la taille est dans le nom du fichier.
    bigArtwork: (url) => url.replace(/-t\d+x\d+\./, '-t500x500.')
  }
}

interface Player {
  win: BrowserWindow
  artwork: { url: string; data: string } // dernière pochette, en data URL (CSP : pas d'image distante)
}

const players = new Map<WebService, Player>()
let quitting = false

const isWeb = (value: unknown): value is WebService =>
  typeof value === 'string' && Object.hasOwn(PLAYERS, value)
const wanted = (service: MusicService): boolean =>
  data.profile.widgets.some((widget) => widget.type === service)

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
  players.set(service, { win, artwork: { url: '', data: '' } })
  // Fermer = cacher : la musique continue.
  win.on('close', (event) => {
    if (quitting) return
    event.preventDefault()
    win.hide()
  })
  // Liens qui ouvrent une fenêtre : navigateur par défaut.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('render-process-gone', (_event, { reason }) => {
    if (reason !== 'clean-exit' && !win.isDestroyed()) win.webContents.reload()
  })
  // Changement de morceau (titre de la page) : pochette préparée en fond, pas à l'ouverture.
  win.on('page-title-updated', () => void musicState(service))
  void win.loadURL(config.home)
}

export function loadMusic(): void {
  app.on('before-quit', () => (quitting = true))
  syncMusic()
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
  return { ready: true, signedIn, track: { ...track, artist: track.artist ?? '', artwork } }
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
  player.artwork = { url, data: '' }
  void download(url, config.artworkHosts).then((dataUrl) => {
    if (player.artwork.url === url) player.artwork.data = dataUrl
  })
  return ''
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

const COMMANDS = new Set<unknown>(['toggle', 'next', 'previous'] satisfies MusicCommand[])

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
async function run(service: unknown, code: (config: WebPlayer) => string): Promise<void> {
  const player = isWeb(service) ? players.get(service) : undefined
  if (!player) return
  const script = code(PLAYERS[service as WebService])
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
