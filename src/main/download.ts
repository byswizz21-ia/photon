// Liens collés ou glissés dans les widgets GIF, Image et Vidéo : le fichier est téléchargé une
// fois chez Photon (saveCopy, background.ts), puis servi comme une copie locale.
// Lien de page (Giphy, Tenor…) : on prend le média qu'elle annonce (balises og:).
// Appel réseau seulement sur action de l'utilisateur, jamais à l'ouverture.
import { net } from 'electron'
import type { FileKind } from '../shared/api'
import { KINDS, saveCopy } from './background'

const TYPES: Record<string, { kind: FileKind; extension: string }> = {
  'image/gif': { kind: 'image', extension: 'gif' },
  'image/webp': { kind: 'image', extension: 'webp' },
  'image/png': { kind: 'image', extension: 'png' },
  'image/apng': { kind: 'image', extension: 'png' },
  'image/jpeg': { kind: 'image', extension: 'jpg' },
  'image/avif': { kind: 'image', extension: 'avif' },
  'video/mp4': { kind: 'video', extension: 'mp4' },
  'video/webm': { kind: 'video', extension: 'webm' }
}
const MB = 1024 * 1024
const MAX_PAGE = 3 * MB
const MAX_VIDEO_LINK = 100 * MB // tout en mémoire avant écriture : borne plus basse qu'un fichier

export function httpsUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2048) return null
  try {
    const url = new URL(value.trim())
    return url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}

// Média annoncé par une page : og:video d'abord (Tenor : mp4 net, son og:image est minuscule),
// sinon og:image (Giphy : webp animé).
export function pageMedia(html: string, base: string): string | null {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? []
  const attribute = (tag: string, name: string): string =>
    new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, 'i').exec(tag)?.[1] ?? ''
  for (const property of ['og:video:secure_url', 'og:video', 'og:image']) {
    for (const tag of tags) {
      if ((attribute(tag, 'property') || attribute(tag, 'name')) !== property) continue
      const content = attribute(tag, 'content').replaceAll('&amp;', '&')
      const url = content && httpsUrl(new URL(content, base).href)
      if (url) return url
    }
  }
  return null
}

// Page Giphy (giphy.com/gifs/chat-qui-tape-JIX9t2j0ZTN9S, /stickers/…, /embed/…) : son mp4, bien
// plus léger que le GIF. Sa page n'annonce pas toujours de média (balises og: absentes).
export function giphyMedia(url: string): string | null {
  const id = /^https:\/\/(?:www\.)?giphy\.com\/(?:gifs|stickers|embed)\/(?:[\w-]*-)?(\w+)\/?$/.exec(
    url
  )?.[1]
  return id ? `https://media.giphy.com/media/${id}/giphy.mp4` : null
}

const mime = (response: Response): string =>
  (response.headers.get('content-type') ?? '').split(';')[0]?.trim().toLowerCase() ?? ''

// Corps lu jusqu'à max octets ; null au-delà (on coupe le téléchargement).
async function read(response: Response, max: number): Promise<Uint8Array | null> {
  if (Number(response.headers.get('content-length')) > max || !response.body) return null
  const chunks: Uint8Array[] = []
  let size = 0
  for await (const chunk of response.body) {
    size += chunk.byteLength
    if (size > max) return null // sortir de la boucle annule le flux
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

const get = (url: string): Promise<Response> =>
  net.fetch(url, { signal: AbortSignal.timeout(20_000) })

// Nom lisible de la copie : dernier morceau du chemin, sans extension (« blitzy-blitzynation »).
const baseName = (url: string): string =>
  decodeURIComponent(new URL(url).pathname.split('/').pop() ?? '').replace(/\.\w+$/, '')

// net.fetch laisse response.url vide : on suit nous-mêmes l'adresse demandée.
async function media(url: string): Promise<{ response: Response; url: string } | null> {
  const giphy = giphyMedia(url)
  if (giphy) return { response: await get(giphy), url: giphy }
  const response = await get(url)
  if (!response.ok || mime(response) !== 'text/html') return { response, url }
  const page = await read(response, MAX_PAGE)
  const found = page && pageMedia(new TextDecoder().decode(page), url)
  return found ? { response: await get(found), url: found } : null
}

export async function importUrl(value: unknown): Promise<string | null> {
  const url = httpsUrl(value)
  if (!url) return null
  try {
    const found = await media(url)
    const type = found && TYPES[mime(found.response)]
    if (!found?.response.ok || !type) return null
    const max = Math.min(KINDS[type.kind].maxBytes, MAX_VIDEO_LINK)
    const bytes = await read(found.response, max)
    return bytes && (await saveCopy(type.kind, baseName(found.url), type.extension, bytes))
  } catch {
    return null // hors ligne, délai dépassé, lien mort
  }
}
