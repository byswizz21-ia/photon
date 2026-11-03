// Sorties à venir (widget Sorties) : films et séries par TMDB (clé gratuite à créer sur
// themoviedb.org), jeux par Steam (« populaires bientôt disponibles », sans clé). Lu en fond
// toutes les 6 h.
import type { Release, ReleaseKind } from '../shared/api'
import { dayKey } from '../shared/day'
import { backgroundFeed, FeedError } from './feeds'
import { arr, getJson, httpsHref, imageData, num, obj, str } from './web'

const EVERY_MS = 6 * 60 * 60_000
const TMDB = 'https://api.themoviedb.org/3'
const STEAM = 'https://store.steampowered.com'
const MAX_ITEMS = 12
const KEY = /^[\w.-]{20,400}$/ // clé v3 (32 caractères) ou jeton v4 (long)

type Raw = Omit<Release, 'image'> & { imageUrl: string }

export function parseTmdb(json: unknown, kind: 'movie' | 'tv', today: string): Raw[] {
  return arr(obj(json)['results'])
    .map(obj)
    .map((r) => {
      const poster = str(r['poster_path'])
      return {
        id: `tmdb:${kind}:${num(r['id']) ?? ''}`,
        title: str(r['title']) || str(r['name']),
        date: str(r['release_date']) || str(r['first_air_date']),
        imageUrl: /^\/[\w.-]+$/.test(poster) ? `https://image.tmdb.org/t/p/w92${poster}` : '',
        url: `https://www.themoviedb.org/${kind}/${num(r['id']) ?? ''}`
      }
    })
    .filter((r) => r.title && r.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
}

async function loadTmdb(kind: 'movie' | 'tv', key: string): Promise<Raw[]> {
  const today = dayKey(new Date())
  const query =
    kind === 'movie'
      ? `/movie/upcoming?region=FR&language=fr-FR`
      : `/discover/tv?language=fr-FR&sort_by=popularity.desc&first_air_date.gte=${today}`
  // Jeton v4 : en-tête ; clé v3 : paramètre.
  const bearer = key.length > 40
  const json = await getJson(`${TMDB}${query}${bearer ? '' : `&api_key=${key}`}`, {
    headers: bearer ? { Authorization: `Bearer ${key}` } : {}
  }).catch((error: unknown) => {
    if (error instanceof Error && error.message.includes('401')) {
      throw new FeedError('Clé TMDB refusée')
    }
    throw error
  })
  return parseTmdb(json, kind, today)
}

// Liste Steam : nom et vignette ; la date vient de la fiche de chaque jeu.
async function loadGames(): Promise<Raw[]> {
  const json = obj(
    await getJson(
      `${STEAM}/search/results/?filter=popularcomingsoon&json=1&cc=fr&l=french&count=${MAX_ITEMS}`
    )
  )
  const games = arr(json['items'])
    .map(obj)
    .map((g) => ({ name: str(g['name']), logo: httpsHref(g['logo']) }))
    .map((g) => ({ ...g, id: /\/apps\/(\d+)\//.exec(g.logo)?.[1] ?? '' }))
    .filter((g) => g.name && g.id)
  return Promise.all(
    games.map(async (g) => {
      const details = await getJson(
        `${STEAM}/api/appdetails?appids=${g.id}&cc=fr&l=french&filters=release_date`
      ).catch(() => null)
      const date = str(obj(obj(obj(obj(details)[g.id])['data'])['release_date'])['date'])
      return {
        id: `steam:${g.id}`,
        title: g.name,
        date: date || 'Bientôt',
        imageUrl: g.logo.replace('capsule_sm_120', 'capsule_231x87'),
        url: `${STEAM}/app/${g.id}`
      }
    })
  )
}

async function load(key: string): Promise<Release[]> {
  const [kind, tmdbKey = ''] = key.split('|') as [ReleaseKind, string?]
  const raw = kind === 'game' ? await loadGames() : await loadTmdb(kind, tmdbKey)
  return Promise.all(
    raw
      .slice(0, MAX_ITEMS)
      .map(async ({ imageUrl, ...r }) => ({ ...r, image: await imageData(imageUrl) }))
  )
}

const feed = backgroundFeed<Release>({
  type: 'releases',
  key: ({ kind, tmdbKey }) => {
    if (kind === 'game') return 'game'
    if (kind !== 'movie' && kind !== 'tv') return null
    const k = typeof tmdbKey === 'string' ? tmdbKey.trim() : ''
    return KEY.test(k) ? `${kind}|${k}` : null // films et séries : pas de clé, pas de lecture
  },
  load,
  every: () => EVERY_MS
})

export const releases = feed.read
