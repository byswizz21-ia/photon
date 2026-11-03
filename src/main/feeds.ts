// Données réseau des widgets, lues en fond et gardées en mémoire (comme la météo) : l'interface
// ne lit que le cache, l'ouverture de Photon ne déclenche aucun appel. Une source = des clés
// (tirées des widgets du profil actif) ; chaque clé a sa propre cadence de rafraîchissement.
import type { Feed } from '../shared/api'
import { data } from './data'
import { isVisible } from './window'

const TICK_MS = 10_000
const RETRY_MS = 3 * 60_000

export interface FeedSource<T> {
  type: string // type de widget
  key(settings: Record<string, unknown>): string | null // null : widget pas encore réglé
  load(key: string): Promise<T[]>
  // Délai avant le prochain rafraîchissement, selon ce qui vient d'être lu.
  every(items: T[], visible: boolean): number
}

interface Entry<T> {
  feed: Feed<T>
  next: number // ms depuis 1970
  running: boolean
}

// Erreur à montrer telle quelle dans le widget (« Clé TMDB refusée ») ; les autres : « Hors ligne ».
export class FeedError extends Error {}

const empty = <T>(): Feed<T> => ({ items: [], updatedAt: null, error: null })
const sources: (() => void)[] = []

export function backgroundFeed<T>(source: FeedSource<T>): {
  read(settings: unknown): Feed<T> | null
} {
  const entries = new Map<string, Entry<T>>()

  const keys = (): Set<string> =>
    new Set(
      data.profile.widgets
        .filter((widget) => widget.type === source.type)
        .map((widget) => source.key(widget.settings))
        .filter((key): key is string => key !== null)
    )

  async function refresh(key: string, entry: Entry<T>): Promise<void> {
    entry.running = true
    try {
      const items = await source.load(key)
      entry.feed = { items, updatedAt: Date.now(), error: null }
      entry.next = Date.now() + source.every(items, isVisible())
    } catch (error) {
      // Clé non écrite dans le journal : elle peut contenir une clé d'API.
      console.warn(`[photon] ${source.type} illisible :`, error)
      const message = error instanceof FeedError ? error.message : 'Hors ligne'
      entry.feed = { ...entry.feed, error: message } // dernières données connues gardées
      entry.next = Date.now() + RETRY_MS
    } finally {
      entry.running = false
    }
  }

  // Clés du profil : les nouvelles sont lues tout de suite, les disparues oubliées.
  function sync(): void {
    const wanted = keys()
    for (const key of entries.keys()) if (!wanted.has(key)) entries.delete(key)
    const now = Date.now()
    for (const key of wanted) {
      let entry = entries.get(key)
      if (!entry) {
        entry = { feed: empty(), next: 0, running: false }
        entries.set(key, entry)
      }
      if (!entry.running && entry.next <= now) void refresh(key, entry)
    }
  }

  sources.push(sync)
  return {
    read(settings) {
      const key = typeof settings === 'object' && settings ? source.key(settings as Record<string, unknown>) : null
      return key === null ? null : (entries.get(key)?.feed ?? empty())
    }
  }
}

// Profil enregistré ou changé (geste de l'utilisateur) et tic régulier.
export function syncFeeds(): void {
  for (const sync of sources) sync()
}

export function startFeeds(): void {
  syncFeeds()
  setInterval(syncFeeds, TICK_MS)
}
