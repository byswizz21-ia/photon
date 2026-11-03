// Lives Twitch du widget Twitch : chaînes suivies (compte connecté dans une fenêtre Photon, session
// à part) et chaînes ajoutées à la main (sans compte). Lu en fond (src/main/feeds.ts) par l'API
// GraphQL du site twitch.tv. Le jeton de connexion (cookie auth-token) reste dans ce fichier :
// envoyé seulement à gql.twitch.tv, jamais à l'interface.
import { BrowserWindow, session, shell, type Session } from 'electron'
import icon from '../../assets/icon.ico?asset'
import type { Feed, TwitchStream } from '../shared/api'
import { backgroundFeed, FeedError } from './feeds'
import { arr, getJson, imageData, num, obj, str, USER_AGENT } from './web'

const GQL = 'https://gql.twitch.tv/gql'
// Identifiant public du site twitch.tv : celui que le jeton de connexion attend.
const CLIENT_ID = 'kimne78kx3ncx6brgo4mv6wki5h1ko'
const LOGIN_URL = 'https://www.twitch.tv/login'
const COOKIE = 'auth-token'
const VISIBLE_MS = 2 * 60_000
const HIDDEN_MS = 5 * 60_000
const PREVIEW_MS = 5 * 60_000 // aperçu du live relu au plus toutes les 5 min
const MAX_CHANNELS = 50
const LOGIN = /^[a-z0-9_]{1,25}$/
const TOKEN = /^[a-z0-9]{20,64}$/i

const USER = `login displayName profileImageURL(width: 70)
  stream { title viewersCount createdAt game { displayName } previewImageURL(width: 320, height: 180) }`
const FOLLOWED = `query { currentUser { followedLiveUsers(first: 100) { edges { node { ${USER} } } } } }`
const CHANNELS = `query ($logins: [String!]) { users(logins: $logins) { ${USER} } }`

type Raw = Omit<TwitchStream, 'avatar' | 'preview'> & { avatarUrl: string; previewUrl: string }

// « ZeratoR, https://twitch.tv/Kamet0 ; squeezie » → ['zerator', 'kamet0', 'squeezie'].
export function parseChannels(raw: unknown): string[] {
  if (typeof raw !== 'string') return []
  const logins = raw
    .split(/[,;\s]+/)
    .map((c) =>
      c
        .trim()
        .toLowerCase()
        .replace(/^(?:https?:\/\/)?(?:www\.)?twitch\.tv\//, '')
        .replace(/[/?#].*$/, '')
    )
    .filter((c) => LOGIN.test(c))
  return [...new Set(logins)].slice(0, MAX_CHANNELS)
}

// Utilisateur GraphQL → live ; null s'il ne stream pas.
export function parseUser(user: unknown): Raw | null {
  const u = obj(user)
  const stream = obj(u['stream'])
  const login = str(u['login'])
  if (!LOGIN.test(login) || !Object.keys(stream).length) return null
  const since = Date.parse(str(stream['createdAt']))
  return {
    login,
    name: str(u['displayName']) || login,
    title: str(stream['title']),
    game: str(obj(stream['game'])['displayName']),
    viewers: num(stream['viewersCount']) ?? 0,
    since: Number.isNaN(since) ? null : since,
    avatarUrl: str(u['profileImageURL']),
    previewUrl: str(stream['previewImageURL'])
  }
}

let twitchSession: Session | null = null
let loginWin: BrowserWindow | null = null

// Session créée au premier besoin : rien à faire pour qui n'a pas le widget.
function own(): Session {
  if (twitchSession) return twitchSession
  const s = session.fromPartition('persist:twitch')
  s.setUserAgent(USER_AGENT)
  s.setPermissionRequestHandler((_wc, _permission, allow) => allow(false))
  s.setPermissionCheckHandler(() => false)
  // Connexion ou déconnexion : les lives sont relus, la fenêtre de connexion se ferme.
  s.cookies.on('changed', (_event, cookie, _cause, removed) => {
    if (cookie.name !== COOKIE) return
    feed.reset()
    if (!removed && loginWin && !loginWin.isDestroyed()) loginWin.close()
  })
  twitchSession = s
  return s
}

async function token(): Promise<string | null> {
  const [cookie] = await own().cookies.get({ url: 'https://www.twitch.tv', name: COOKIE })
  return cookie && TOKEN.test(cookie.value) ? cookie.value : null
}

const gql = (body: object, auth: string | null): Promise<unknown> =>
  getJson(GQL, {
    method: 'POST',
    headers: {
      'Client-Id': CLIENT_ID,
      'Content-Type': 'application/json',
      ...(auth ? { Authorization: `OAuth ${auth}` } : {})
    },
    body: JSON.stringify(body)
  })

const data = (json: unknown): Record<string, unknown> => obj(obj(json)['data'])

async function load(key: string): Promise<TwitchStream[]> {
  const logins = parseChannels(key)
  const auth = await token()
  const [followed, channels] = await Promise.all([
    auth ? gql({ query: FOLLOWED }, auth) : null,
    logins.length ? gql({ query: CHANNELS, variables: { logins } }, null) : null
  ])
  const me = followed ? data(followed)['currentUser'] : undefined
  // Jeton refusé (expiré, mot de passe changé) : Twitch répond sans utilisateur.
  if (followed && !me) throw new FeedError('Reconnecte-toi à Twitch')
  const users = [
    ...arr(obj(obj(me)['followedLiveUsers'])['edges']).map((e) => obj(e)['node']),
    ...(channels ? arr(data(channels)['users']) : [])
  ]
  const seen = new Set<string>()
  const lives = users
    .map(parseUser)
    .filter((s): s is Raw => s !== null && !seen.has(s.login) && !!seen.add(s.login))
    .sort((a, b) => b.viewers - a.viewers)
  const bucket = Math.floor(Date.now() / PREVIEW_MS)
  return Promise.all(
    lives.map(async ({ avatarUrl, previewUrl, ...live }) => ({
      ...live,
      avatar: await imageData(avatarUrl),
      preview: previewUrl ? await imageData(`${previewUrl}?t=${bucket}`) : ''
    }))
  )
}

const feed = backgroundFeed<TwitchStream>({
  type: 'twitch',
  key: (settings) => parseChannels(settings['channels']).join(','),
  load,
  every: (_items, visible) => (visible ? VISIBLE_MS : HIDDEN_MS)
})

export async function twitch(
  settings: unknown
): Promise<{ feed: Feed<TwitchStream>; signedIn: boolean }> {
  return {
    feed: feed.read(settings) ?? { items: [], updatedAt: null, error: null },
    signedIn: (await token()) !== null
  }
}

// Page de connexion de Twitch ; se ferme d'elle-même une fois connecté.
export function twitchLogin(): void {
  if (loginWin && !loginWin.isDestroyed()) {
    loginWin.show()
    loginWin.focus()
    return
  }
  loginWin = new BrowserWindow({
    width: 520,
    height: 760,
    title: 'Twitch · Photon',
    icon,
    autoHideMenuBar: true,
    webPreferences: {
      session: own(),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  })
  // Liens (aide, inscription…) : navigateur par défaut.
  loginWin.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url)
    return { action: 'deny' }
  })
  void loginWin.loadURL(LOGIN_URL)
}

export async function twitchLogout(): Promise<void> {
  await own().clearStorageData()
  feed.reset()
}
