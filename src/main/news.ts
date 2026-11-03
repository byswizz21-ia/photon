// Actualités des widgets Actualités : un flux RSS par sujet (Google Actualités en français, ou
// l'adresse RSS d'un site), lus en fond (démarrage, puis toutes les 30 min), jamais à
// l'ouverture de Photon. L'interface ne lit que le cache. Ouvrir un article : seulement un lien
// déjà lu dans un flux.
import { net, shell } from 'electron'
import { DEFAULT_NEWS_TOPICS, type NewsFeed, type NewsItem } from '../shared/api'
import { data } from './data'

const REFRESH_MS = 30 * 60_000
const RETRY_MS = 5 * 60_000
const TIMEOUT_MS = 10_000
const MAX_TOPICS = 8
const PER_TOPIC = 15
const MAX_ITEMS = 40

const feeds = new Map<string, NewsItem[]>()
const failed = new Set<string>()
const pending = new Map<string, Promise<boolean>>()
let updatedAt: number | null = null
let timer: NodeJS.Timeout | undefined

// « IA, Formule 1 ; https://site/rss » → ['IA', 'Formule 1', 'https://site/rss'].
export function parseTopics(raw: unknown): string[] {
  if (typeof raw !== 'string') return []
  const topics = raw
    .split(/[,;\n]+/)
    .map((t) => t.trim().replace(/\s+/g, ' ').slice(0, 300))
    .filter(Boolean)
  return [...new Set(topics)].slice(0, MAX_TOPICS)
}

export function feedUrl(topic: string): string {
  if (/^https:\/\/\S+$/i.test(topic)) return topic
  return `https://news.google.com/rss/search?q=${encodeURIComponent(topic)}&hl=fr&gl=FR&ceid=FR:fr`
}

function watchedTopics(): string[] {
  const all = data.profile.widgets
    .filter((widget) => widget.type === 'news')
    .flatMap((widget) => {
      const topics = widget.settings['topics']
      return parseTopics(typeof topics === 'string' ? topics : DEFAULT_NEWS_TOPICS)
    })
  return [...new Set(all)]
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' '
}

function text(raw: string): string {
  return raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (all, code: string) => {
      if (code[0] !== '#') return ENTITIES[code.toLowerCase()] ?? all
      const n =
        code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : Number(code.slice(1))
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : ''
    })
    .replace(/\s+/g, ' ')
    .trim()
}

const tag = (item: string, name: string): string =>
  text(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i').exec(item)?.[1] ?? '')

// RSS 2.0 : titre, lien https, source (Google : « Titre - Source »), date. Le reste est ignoré.
// ponytail: regex, pas un vrai parseur XML ; suffit pour RSS 2.0, ajouter Atom si un site le demande.
export function parseRss(xml: string, topic: string): NewsItem[] {
  // Nom du site : « Le Monde.fr - Actualités et Infos… » → « Le Monde.fr ».
  const channel = tag(xml.replace(/<item[\s>][\s\S]*$/i, ''), 'title').split(/ [-–|:] /)[0] ?? ''
  return [...xml.matchAll(/<item[\s>]([\s\S]*?)<\/item>/gi)]
    .map(([, item = '']) => {
      const source = tag(item, 'source') || channel
      let title = tag(item, 'title')
      if (source && title.endsWith(` - ${source}`)) title = title.slice(0, -source.length - 3)
      const date = Date.parse(tag(item, 'pubDate'))
      return {
        title,
        link: tag(item, 'link'),
        source,
        date: Number.isFinite(date) ? date : 0,
        topic
      }
    })
    .filter((item) => item.title && /^https:\/\/\S+$/i.test(item.link))
    .slice(0, PER_TOPIC)
}

async function download(topic: string): Promise<boolean> {
  try {
    const response = await net.fetch(feedUrl(topic), { signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!response.ok) throw new Error(`réponse ${response.status}`)
    feeds.set(topic, parseRss(await response.text(), topic))
    failed.delete(topic)
    updatedAt = Date.now()
    return true
  } catch (error) {
    console.warn(`[photon] actualités illisibles (${topic}) : ${String(error)}`)
    failed.add(topic) // les articles précédents restent affichés
    return false
  }
}

function refresh(topic: string): Promise<boolean> {
  let read = pending.get(topic)
  if (!read) {
    read = download(topic).finally(() => pending.delete(topic))
    pending.set(topic, read)
  }
  return read
}

async function refreshAll(): Promise<void> {
  clearTimeout(timer)
  const topics = watchedTopics()
  for (const topic of feeds.keys()) if (!topics.includes(topic)) feeds.delete(topic)
  const results = await Promise.all(topics.map(refresh))
  timer = setTimeout(() => void refreshAll(), results.every(Boolean) ? REFRESH_MS : RETRY_MS)
}

export function startNews(): void {
  void refreshAll()
}

// Profil enregistré ou changé : un sujet nouveau est lu tout de suite (geste de l'utilisateur).
export function onNewsProfile(): void {
  for (const topic of watchedTopics()) {
    if (!feeds.has(topic) && !failed.has(topic)) void refresh(topic)
  }
}

// Cache seulement : articles des sujets du widget, plus récents d'abord, titres en double retirés.
export function news(raw: unknown): NewsFeed {
  const topics = parseTopics(raw)
  const seen = new Set<string>()
  const items = topics
    .flatMap((topic) => feeds.get(topic) ?? [])
    .sort((a, b) => b.date - a.date)
    .filter((item) => !seen.has(item.title) && seen.add(item.title))
    .slice(0, MAX_ITEMS)
  return {
    items,
    loading: topics.some((t) => !feeds.has(t) && !failed.has(t)),
    failed: topics.filter((t) => failed.has(t) && !feeds.has(t)),
    updatedAt
  }
}

// Seulement un lien présent dans un flux lu : l'interface ne peut pas ouvrir n'importe quoi.
export async function openNews(link: unknown): Promise<boolean> {
  if (typeof link !== 'string') return false
  const known = [...feeds.values()].some((items) => items.some((item) => item.link === link))
  if (!known) return false
  await shell.openExternal(link)
  return true
}
