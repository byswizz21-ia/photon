// Paroles synchronisées du design « Adapté » de Spotify (LRCLIB, gratuit, sans clé). Demandées
// par le widget quand le morceau change, jamais à l'ouverture de Photon : l'affichage n'attend pas.
// Seuls titre, artiste et durée partent sur le réseau. Un résultat par morceau, gardé en mémoire.
import { net } from 'electron'
import type { LyricLine } from '../shared/api'

const TIMEOUT_MS = 8_000
const MAX_CACHED = 50
const MAX_TEXT = 200

const cache = new Map<string, LyricLine[] | null>() // null : pas de paroles synchronisées
const pending = new Map<string, Promise<LyricLine[] | null>>()

// « [01:23.45] texte » → { time: 83.45, text } ; lignes vides et balises seules ignorées.
export function parseLrc(lrc: string): LyricLine[] {
  const lines: LyricLine[] = []
  for (const row of lrc.split('\n')) {
    const match = /^\[(\d+):(\d+(?:\.\d+)?)\](.*)$/.exec(row.trim())
    if (!match) continue
    const text = match[3]!.trim()
    if (text) lines.push({ time: Number(match[1]) * 60 + Number(match[2]), text })
  }
  return lines.sort((a, b) => a.time - b.time)
}

async function download(
  title: string,
  artist: string,
  duration: number
): Promise<LyricLine[] | null> {
  const query = new URLSearchParams({
    track_name: title,
    artist_name: artist,
    duration: String(Math.round(duration))
  })
  const response = await net.fetch(`https://lrclib.net/api/get?${query}`, {
    headers: { 'User-Agent': 'Photon (widget Spotify)' },
    signal: AbortSignal.timeout(TIMEOUT_MS)
  })
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`réponse ${response.status}`)
  const synced = ((await response.json()) as Record<string, unknown>)['syncedLyrics']
  const lines = typeof synced === 'string' ? parseLrc(synced) : []
  return lines.length ? lines : null
}

export async function lyrics(
  title: unknown,
  artist: unknown,
  duration: unknown
): Promise<LyricLine[] | null> {
  if (typeof title !== 'string' || typeof artist !== 'string' || typeof duration !== 'number')
    return null
  if (!title.trim() || !Number.isFinite(duration) || duration <= 0) return null
  const key = `${artist}\n${title}\n${Math.round(duration)}`.slice(0, MAX_TEXT * 2)
  if (cache.has(key)) return cache.get(key)!
  let request = pending.get(key)
  if (!request) {
    request = download(title.slice(0, MAX_TEXT), artist.slice(0, MAX_TEXT), duration)
      .then((lines) => {
        cache.set(key, lines) // panne réseau : pas gardée, réessayée au prochain morceau
        if (cache.size > MAX_CACHED) cache.delete(cache.keys().next().value as string)
        return lines
      })
      .catch(() => null)
      .finally(() => pending.delete(key))
    pending.set(key, request)
  }
  return request
}
