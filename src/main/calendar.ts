// Agendas iCal des widgets Agenda : lus en fond (démarrage, puis toutes les 15 min), jamais à
// l'ouverture de Photon. L'interface ne lit que le cache en mémoire (aucun appel réseau).
// L'adresse iCal secrète donne accès à l'agenda : elle n'est jamais écrite dans le log.
import { net } from 'electron'
import type { CalendarFeed } from '../shared/api'
import { data } from './data'
import { parseEvents } from './ical'

const REFRESH_MS = 15 * 60_000
const RETRY_MS = 2 * 60_000 // hors ligne au démarrage : on réessaie plus tôt
const TIMEOUT_MS = 15_000
const MAX_CHARS = 5_000_000 // un agenda de plusieurs années pèse quelques Mo au plus
const DAYS_AHEAD = 14
const MAX_EVENTS = 50

const feeds = new Map<string, CalendarFeed>()
const pending = new Map<string, Promise<boolean>>()
let timer: NodeJS.Timeout | undefined

// webcal:// (lien « S'abonner ») = https ; tout autre protocole est refusé.
export function normalizeUrl(raw: string): string | null {
  try {
    const url = new URL(raw.trim().replace(/^webcal:\/\//i, 'https://'))
    return url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}

// Adresses des widgets Agenda du profil courant.
function watchedUrls(): string[] {
  const urls = data.profile.widgets
    .filter((widget) => widget.type === 'calendar' && typeof widget.settings['url'] === 'string')
    .map((widget) => normalizeUrl(widget.settings['url'] as string))
  return [...new Set(urls.filter((url) => url !== null))]
}

async function download(url: string): Promise<boolean> {
  const previous = feeds.get(url)
  try {
    const response = await net.fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!response.ok) throw new Error(`réponse ${response.status}`)
    const text = await response.text()
    if (text.length > MAX_CHARS) throw new Error('agenda trop volumineux')
    const events = parseEvents(text, Date.now(), DAYS_AHEAD, MAX_EVENTS)
    feeds.set(url, { events, updatedAt: Date.now(), error: null })
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`[photon] agenda illisible : ${message}`)
    // On garde les derniers événements connus : mieux vaut un agenda de 15 min qu'un vide.
    feeds.set(url, {
      events: previous?.events ?? [],
      updatedAt: previous?.updatedAt ?? null,
      error: message
    })
    return false
  }
}

function refresh(url: string): Promise<boolean> {
  let read = pending.get(url)
  if (!read) {
    read = download(url).finally(() => pending.delete(url))
    pending.set(url, read)
  }
  return read
}

async function refreshAll(): Promise<void> {
  clearTimeout(timer)
  const urls = watchedUrls()
  for (const url of feeds.keys()) if (!urls.includes(url)) feeds.delete(url)
  const results = await Promise.all(urls.map(refresh))
  timer = setTimeout(() => void refreshAll(), results.every(Boolean) ? REFRESH_MS : RETRY_MS)
}

export function startCalendars(): void {
  void refreshAll()
}

// Profil enregistré : une adresse nouvelle est lue tout de suite (geste de l'utilisateur).
export function onProfileSaved(): void {
  for (const url of watchedUrls()) if (!feeds.has(url)) void refresh(url)
}

// Cache seulement. null : adresse invalide. updatedAt null et pas d'erreur : première lecture en cours.
export function calendar(raw: unknown): CalendarFeed | null {
  const url = typeof raw === 'string' ? normalizeUrl(raw) : null
  if (!url) return null
  return feeds.get(url) ?? { events: [], updatedAt: null, error: null }
}
