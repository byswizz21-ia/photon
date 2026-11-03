// Matchs (widget Matchs) : foot par l'API publique d'ESPN (une ligue, ou une équipe), League of
// Legends par celle de lolesports (même clé publique que le site), Valorant en lisant vlr.gg
// (pas d'API ouverte). Sans clé. Lu en fond : chaque minute pendant un match en direct Photon
// ouvert, sinon toutes les 10 min (30 min caché).
import type { FootTeam, Match, MatchTeam } from '../shared/api'
import { backgroundFeed } from './feeds'
import { arr, getJson, getText, httpsHref, imageData, num, obj, str } from './web'

const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/soccer'
const LOL_SCHEDULE = 'https://esports-api.lolesports.com/persisted/gw/getSchedule?hl=fr-FR'
const LOL_KEY = '0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z' // publique, celle de lolesports.com
const VLR = 'https://www.vlr.gg'
const LEAGUE = /^[a-z]{3,8}\.[a-z0-9_]{1,20}$/ // « fra.1 », « uefa.champions »
const TEAM = /^\d{1,8}$/
const MAX_DONE = 4
const MAX_NEXT = 8

type Raw = Omit<Match, 'home' | 'away'> & {
  home: Omit<MatchTeam, 'logo'> & { logoUrl: string }
  away: Omit<MatchTeam, 'logo'> & { logoUrl: string }
}

// --- Foot (ESPN) ---

const espnLogo = (url: string): string => {
  const path = /^https:\/\/a\.espncdn\.com(\/i\/teamlogos\/[\w/.-]+)$/.exec(url)?.[1]
  return path ? `https://a.espncdn.com/combiner/i?img=${path}&w=64&h=64` : ''
}

const ESPN_STATE: Record<string, Match['state']> = { pre: 'upcoming', in: 'live', post: 'done' }

export function parseEspn(json: unknown): Raw[] {
  return arr(obj(json)['events']).flatMap((raw): Raw[] => {
    const event = obj(raw)
    const competition = obj(arr(event['competitions'])[0])
    // Calendrier d'équipe : statut dans la rencontre ; tableau de la ligue : dans l'événement.
    const status = obj(obj(competition['status'] ?? event['status'])['type'])
    const state = ESPN_STATE[str(status['state'])]
    const sides = arr(competition['competitors']).map(obj)
    const side = (where: string): Raw['home'] | null => {
      const c = sides.find((s) => s['homeAway'] === where)
      if (!c) return null
      const team = obj(c['team'])
      const score = c['score']
      const logo = str(team['logo']) || str(obj(arr(team['logos'])[0])['href'])
      return {
        name: str(team['shortDisplayName']) || str(team['displayName']),
        short: str(team['abbreviation']),
        logoUrl: espnLogo(logo),
        score:
          state === 'upcoming'
            ? null
            : (num(obj(score)['value']) ?? (typeof score === 'string' ? Number(score) : null))
      }
    }
    const home = side('home')
    const away = side('away')
    const start = Date.parse(str(event['date']))
    if (!state || !home || !away || Number.isNaN(start)) return []
    return [
      {
        id: `espn:${str(event['id'])}`,
        start,
        state,
        home,
        away,
        event: str(obj(event['league'])['abbreviation']),
        url: httpsHref(obj(arr(event['links'])[0])['href'])
      }
    ]
  })
}

async function loadFoot(league: string, team: string): Promise<Raw[]> {
  if (!team) return parseEspn(await getJson(`${ESPN}/${league}/scoreboard`))
  const [results, fixtures] = await Promise.all([
    getJson(`${ESPN}/${league}/teams/${team}/schedule`).then(parseEspn),
    getJson(`${ESPN}/${league}/teams/${team}/schedule?fixture=true`).then(parseEspn)
  ])
  return [...results, ...fixtures]
}

export async function footTeams(league: unknown): Promise<FootTeam[] | null> {
  if (typeof league !== 'string' || !LEAGUE.test(league)) return null
  try {
    const json = obj(await getJson(`${ESPN}/${league}/teams`))
    const teams = arr(obj(arr(obj(arr(json['sports'])[0])['leagues'])[0])['teams'])
    return teams
      .map((t) => obj(obj(t)['team']))
      .map((t) => ({ id: str(t['id']), name: str(t['displayName']) }))
      .filter((t) => TEAM.test(t.id) && t.name)
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  } catch (error) {
    console.warn('[photon] équipes illisibles :', error)
    return null
  }
}

// --- League of Legends (lolesports) ---

const LOL_STATE: Record<string, Match['state']> = {
  unstarted: 'upcoming',
  inProgress: 'live',
  completed: 'done'
}

export function parseLol(json: unknown): Raw[] {
  const schedule = obj(obj(obj(json)['data'])['schedule'])
  return arr(schedule['events']).flatMap((raw): Raw[] => {
    const event = obj(raw)
    const match = obj(event['match'])
    const state = LOL_STATE[str(event['state'])]
    const teams = arr(match['teams']).map(obj)
    const start = Date.parse(str(event['startTime']))
    if (event['type'] !== 'match' || !state || teams.length !== 2 || Number.isNaN(start)) return []
    const side = (t: Record<string, unknown>): Raw['home'] => ({
      name: str(t['name']),
      short: str(t['code']),
      logoUrl: httpsHref(str(t['image']).replace(/^http:/, 'https:')),
      score: state === 'upcoming' ? null : num(obj(t['result'])['gameWins'])
    })
    const league = obj(event['league'])
    const block = str(event['blockName'])
    return [
      {
        id: `lol:${str(match['id'])}`,
        start,
        state,
        home: side(teams[0] as Record<string, unknown>),
        away: side(teams[1] as Record<string, unknown>),
        event: [str(league['name']), block].filter(Boolean).join(' · '),
        url: `https://lolesports.com/fr-FR/leagues/${encodeURIComponent(str(league['slug']))}`
      }
    ]
  })
}

// --- Valorant (vlr.gg) ---

const decode = (html: string): string =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&ndash;/g, '–')
    .replace(/&amp;/g, '&')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()

// « 1w 3d », « 5d 4h », « 23m » → ms.
export function eta(text: string): number | null {
  const units: Record<string, number> = { w: 604_800_000, d: 86_400_000, h: 3_600_000, m: 60_000 }
  const parts = [...text.matchAll(/(\d+)\s*([wdhm])/g)]
  return parts.length ? parts.reduce((ms, [, n, u]) => ms + Number(n) * units[u as string]!, 0) : null
}

// Heure affichée par vlr.gg (fuseau du visiteur, déduit de son adresse) : vérifiée contre le délai
// « dans 1d 4h » ; trop loin (fuseau mal deviné), on garde le délai.
function vlrStart(day: string, time: string, wait: number | null, now: number, done: boolean): number {
  const guess = Date.parse(`${day} ${time.replace(/\s*(AM|PM)$/i, ' $1')}`)
  const fromEta = wait === null ? NaN : done ? now - wait : now + wait
  if (Number.isNaN(guess)) return Number.isNaN(fromEta) ? now : fromEta
  return Number.isNaN(fromEta) || Math.abs(guess - fromEta) < 90 * 60_000 ? guess : fromEta
}

export function parseVlr(html: string, now: number): Raw[] {
  const matches: Raw[] = []
  let day = ''
  const tokens = html.split(/(?=<div class="wf-label mod-large">)|(?=<a href="\/\d+\/[^"]*" class="wf-module-item match-item)/)
  for (const token of tokens) {
    if (token.startsWith('<div class="wf-label mod-large">')) {
      day = decode(token.slice(0, token.indexOf('</div>'))).replace(/\b(Today|Yesterday)\b/, '').trim()
      continue
    }
    const id = /^<a href="\/(\d+)\/([^"]*)"/.exec(token)
    if (!id) continue
    const item = token.slice(0, token.indexOf('</a>') + 4)
    const names = [...item.matchAll(/match-item-vs-team-name">([\s\S]*?)<\/div>\s*<\/div>/g)].map((m) =>
      decode(m[1] ?? '')
    )
    const scores = [...item.matchAll(/match-item-vs-team-score[^"]*">([\s\S]*?)<\/div>/g)].map((m) => {
      const n = Number.parseInt(decode(m[1] ?? ''), 10)
      return Number.isNaN(n) ? null : n
    })
    const status = /ml-status">([^<]*)/.exec(item)?.[1]?.trim().toLowerCase() ?? ''
    const state: Match['state'] =
      status === 'live' ? 'live' : status === 'completed' ? 'done' : 'upcoming'
    const time = decode(/match-item-time">([\s\S]*?)<\/div>/.exec(item)?.[1] ?? '')
    const wait = eta(/ml-eta[^"]*">([^<]*)/.exec(item)?.[1] ?? '')
    const series = decode(/match-item-event-series[^"]*">([\s\S]*?)<\/div>/.exec(item)?.[1] ?? '')
    const event = decode(
      (/match-item-event text-of">([\s\S]*?)<\/div>\s*<div class="match-item-icon/.exec(item)?.[1] ?? '')
        .replace(/<div class="match-item-event-series[\s\S]*?<\/div>/, '')
    )
    if (names.length !== 2) continue
    const side = (i: number): Raw['home'] => ({
      name: names[i] ?? '',
      short: '',
      logoUrl: '',
      score: state === 'upcoming' ? null : (scores[i] ?? null)
    })
    matches.push({
      id: `vlr:${id[1]}`,
      start: vlrStart(day, time, wait, now, state === 'done'),
      state,
      home: side(0),
      away: side(1),
      event: [event, series].filter(Boolean).join(' · '),
      url: `${VLR}/${id[1]}/${id[2]}`
    })
  }
  return matches
}

// --- Commun ---

const mentions = (match: Raw, filter: string): boolean => {
  const text = `${match.home.name} ${match.home.short} ${match.away.name} ${match.away.short} ${match.event}`
  return filter
    .split(',')
    .map((f) => f.trim().toLowerCase())
    .filter(Boolean)
    .some((f) => text.toLowerCase().includes(f))
}

// En direct, puis les prochains, puis les derniers résultats (plus récents d'abord).
export function pick(matches: Raw[], filter: string): Raw[] {
  const kept = filter.trim() ? matches.filter((m) => mentions(m, filter)) : matches
  const unique = [...new Map(kept.map((m) => [m.id, m])).values()]
  const by = (state: Match['state']): Raw[] => unique.filter((m) => m.state === state)
  return [
    ...by('live'),
    ...by('upcoming').sort((a, b) => a.start - b.start).slice(0, MAX_NEXT),
    ...by('done').sort((a, b) => b.start - a.start).slice(0, MAX_DONE)
  ]
}

async function load(key: string): Promise<Match[]> {
  const [sport, a = '', b = ''] = key.split('|')
  let raw: Raw[]
  if (sport === 'foot') raw = await loadFoot(a, b)
  else if (sport === 'lol') raw = parseLol(await getJson(LOL_SCHEDULE, { headers: { 'x-api-key': LOL_KEY } }))
  else {
    const [next, done] = await Promise.all([
      getText(`${VLR}/matches`),
      getText(`${VLR}/matches/results`)
    ])
    raw = [...parseVlr(next, Date.now()), ...parseVlr(done, Date.now())]
  }
  const kept = pick(raw, sport === 'foot' ? '' : a)
  const withLogo = async ({ logoUrl, ...team }: Raw['home']): Promise<MatchTeam> => ({
    ...team,
    logo: await imageData(logoUrl)
  })
  return Promise.all(
    kept.map(async (m) => ({ ...m, home: await withLogo(m.home), away: await withLogo(m.away) }))
  )
}

export function matchKey(settings: Record<string, unknown>): string | null {
  const { sport, league, team, filter } = settings
  const text = typeof filter === 'string' ? filter.replace(/\|/g, ' ').trim().slice(0, 80) : ''
  if (sport === 'lol' || sport === 'valorant') return `${sport}|${text}`
  if (sport !== 'foot' || typeof league !== 'string' || !LEAGUE.test(league)) return null
  return `foot|${league}|${typeof team === 'string' && TEAM.test(team) ? team : ''}`
}

const feed = backgroundFeed<Match>({
  type: 'matches',
  key: matchKey,
  load,
  every: (items, visible) => {
    const live = items.some((m) => m.state === 'live')
    if (live) return visible ? 60_000 : 5 * 60_000
    return visible ? 10 * 60_000 : 30 * 60_000
  }
})

export const matches = feed.read
