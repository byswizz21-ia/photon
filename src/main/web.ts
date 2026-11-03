// Appels réseau des widgets (jeux gratuits, matchs, sorties, bus, traduction) : délai et taille
// bornés, et vignettes converties en data URL (l'interface n'affiche aucune image distante).
import { net } from 'electron'

const TIMEOUT_MS = 12_000
const MAX_TEXT = 4 * 1024 * 1024
const MAX_IMAGE = 400 * 1024
const MAX_IMAGES = 300 // vignettes gardées en mémoire, les plus anciennes partent

// Navigateur ordinaire : certains sites refusent un client inconnu.
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'

export async function getText(url: string, init: RequestInit = {}): Promise<string> {
  const response = await net.fetch(url, {
    ...init,
    headers: { 'User-Agent': USER_AGENT, ...init.headers },
    signal: AbortSignal.timeout(TIMEOUT_MS)
  })
  if (!response.ok) throw new Error(`réponse ${response.status}`)
  const text = await response.text()
  if (text.length > MAX_TEXT) throw new Error('réponse trop grosse')
  return text
}

export const getJson = async (url: string, init?: RequestInit): Promise<unknown> =>
  JSON.parse(await getText(url, init)) as unknown

// Lecture prudente d'un JSON venu d'ailleurs.
export const obj = (v: unknown): Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
export const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
export const str = (v: unknown): string => (typeof v === 'string' ? v : '')
export const num = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null

const images = new Map<string, Promise<string>>()

// Vignette d'une adresse https en data URL ; '' si illisible, trop grosse ou pas une image.
export function imageData(url: string): Promise<string> {
  if (!url.startsWith('https://')) return Promise.resolve('')
  let image = images.get(url)
  if (!image) {
    image = net
      .fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
      .then(async (response) => {
        const type = response.headers.get('content-type') ?? ''
        if (!response.ok || !type.startsWith('image/')) return ''
        const bytes = Buffer.from(await response.arrayBuffer())
        return bytes.length <= MAX_IMAGE ? `data:${type};base64,${bytes.toString('base64')}` : ''
      })
      .catch(() => '')
    images.set(url, image)
    if (images.size > MAX_IMAGES) images.delete(images.keys().next().value as string)
  }
  return image
}

// Adresse https sûre à ouvrir dans le navigateur, sinon ''.
export function httpsHref(value: unknown): string {
  try {
    const url = new URL(str(value))
    return url.protocol === 'https:' ? url.href : ''
  } catch {
    return ''
  }
}
