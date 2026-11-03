// Prochains passages (widget Bus et tram) : réseau Divia (Dijon), temps réel. Divia ne publie pas
// de flux ouvert des passages : on passe, comme son site, par le relais Navitia de Hove
// (jeton chiffré fabriqué ici, sans compte). Même méthode que le paquet divia-api (MIT).
// Lu en fond : toutes les 30 s Photon ouvert, toutes les 2 min caché.
import type { TransitDeparture, TransitLine, TransitStop } from '../shared/api'
import { backgroundFeed } from './feeds'
import { arr, getJson, obj, str } from './web'

const HOVE = 'https://nws-main.hove.io'
const CLIENT = 'divia'
const COVERAGE = '/v1/coverage/fr-ne-dijon'
const ID = /^[\w:.-]{1,80}$/
const MAX_TIMES = 4

const base64 = (bytes: ArrayBuffer | Uint8Array): string =>
  Buffer.from(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)).toString('base64')

// Jeton attendu par le relais : petit JSON chiffré en AES-GCM, clé dérivée de son adresse.
async function token(): Promise<string> {
  const text = new TextEncoder()
  const material = await crypto.subtle.importKey('raw', text.encode(HOVE), 'PBKDF2', false, [
    'deriveKey'
  ])
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: text.encode('mon-sel-fixe-ou-dynamique'),
      iterations: 100_000,
      hash: 'SHA-256'
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  )
  const payload = {
    clientName: CLIENT,
    tokenId: crypto.randomUUID(),
    iat: Math.floor(Date.now() / 1000)
  }
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const sealed = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    text.encode(JSON.stringify(payload))
  )
  return `${base64(iv)}.${base64(sealed)}`
}

async function navitia(path: string, query: Record<string, string>): Promise<unknown> {
  const auth = await token()
  const presign = obj(
    await getJson(`${HOVE}/api/presign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Auth': auth, Origin: HOVE },
      body: JSON.stringify({ clientName: CLIENT, method: 'POST', path, query })
    })
  )
  return getJson(`${HOVE}/api/proxy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-auth-token': auth },
    body: JSON.stringify({
      clientName: CLIENT,
      href: `https://api.navitia.io${path}?${new URLSearchParams(query).toString()}`,
      presignedUrl: str(presign['url'])
    })
  })
}

// « 20261103T131033 », heure de Dijon → ms. Le PC est supposé à l'heure française.
export function navitiaTime(raw: string): number | null {
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/.exec(raw)
  if (!m) return null
  const [y, mo, d, h, mi, s] = m.slice(1).map(Number) as [
    number,
    number,
    number,
    number,
    number,
    number
  ]
  return new Date(y, mo - 1, d, h, mi, s).getTime()
}

export async function transitLines(): Promise<TransitLine[] | null> {
  try {
    const json = obj(
      await navitia(`${COVERAGE}/lines`, { count: '300', disable_geojson: 'true', depth: '0' })
    )
    return arr(json['lines'])
      .map(obj)
      .map((line) => ({
        id: str(line['id']),
        code: str(line['code']),
        name: str(line['name']),
        color: /^[0-9a-f]{6}$/i.test(str(line['color'])) ? str(line['color']) : ''
      }))
      .filter((line) => ID.test(line.id))
      .sort((a, b) => a.code.localeCompare(b.code, 'fr', { numeric: true }))
  } catch (error) {
    console.warn('[photon] lignes Divia illisibles :', error)
    return null
  }
}

export async function transitStops(line: unknown): Promise<TransitStop[] | null> {
  if (typeof line !== 'string' || !ID.test(line)) return null
  try {
    const json = obj(
      await navitia(`${COVERAGE}/lines/${line}/stop_areas`, { count: '200', depth: '1' })
    )
    return arr(json['stop_areas'])
      .map(obj)
      .map((stop) => ({ id: str(stop['id']), name: str(stop['name']) }))
      .filter((stop) => ID.test(stop.id))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  } catch (error) {
    console.warn('[photon] arrêts Divia illisibles :', error)
    return null
  }
}

export function parseSchedules(json: unknown, now: number): TransitDeparture[] {
  return arr(obj(json)['terminus_schedules']).map((raw) => {
    const schedule = obj(raw)
    const info = obj(schedule['display_informations'])
    const direction =
      str(info['direction']) || str(obj(obj(schedule['route'])['direction'])['name'])
    const times = arr(schedule['date_times'])
      .map(obj)
      .map((t) => ({
        at: navitiaTime(str(t['date_time'])) ?? NaN,
        realtime: t['data_freshness'] === 'realtime'
      }))
      .filter((t) => t.at >= now - 60_000) // passé depuis moins d'une minute : encore affiché
      .sort((a, b) => a.at - b.at)
      .slice(0, MAX_TIMES)
    return { direction: direction.replace(/\s*\(Dijon\)$/, ''), times }
  })
}

const stamp = (date: Date): string =>
  `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}00`

async function load(key: string): Promise<TransitDeparture[]> {
  const [line, stop] = key.split('|') as [string, string]
  const json = await navitia(`${COVERAGE}/lines/${line}/stop_areas/${stop}/terminus_schedules`, {
    count: '10',
    data_freshness: 'realtime',
    disable_geojson: 'true',
    from_datetime: stamp(new Date()),
    items_per_schedule: String(MAX_TIMES)
  })
  return parseSchedules(json, Date.now())
}

const feed = backgroundFeed<TransitDeparture>({
  type: 'transit',
  key: (settings) => {
    const { line, stop } = settings
    return typeof line === 'string' && ID.test(line) && typeof stop === 'string' && ID.test(stop)
      ? `${line}|${stop}`
      : null
  },
  load,
  every: (_items, visible) => (visible ? 30_000 : 2 * 60_000)
})

export const transit = feed.read
