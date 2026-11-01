// Cours des widgets Cours (crypto, actions, indices) : Yahoo Finance, sans clé. Lus en fond
// (démarrage, puis toutes les 5 min), jamais à l'ouverture de Photon. L'interface ne lit que le
// cache. Symboles Yahoo : BTC-EUR, ETH-USD, AAPL, MC.PA, ^FCHI…
import { net } from 'electron'
import type { MarketFeed, MarketQuote } from '../shared/api'
import { data } from './data'

const REFRESH_MS = 5 * 60_000
const RETRY_MS = 60_000
const TIMEOUT_MS = 10_000
const MAX_SYMBOLS = 8

const quotes = new Map<string, MarketQuote>()
const failed = new Set<string>() // dernière lecture en échec (le cours précédent reste affiché)
let updatedAt: number | null = null
let timer: NodeJS.Timeout | undefined

// « btc-eur, aapl » → ['BTC-EUR', 'AAPL'] ; un symbole invalide est ignoré.
export function parseSymbols(raw: unknown): string[] {
  if (typeof raw !== 'string') return []
  const symbols = raw
    .toUpperCase()
    .split(/[\s,;]+/)
    .filter((s) => /^[A-Z0-9^][A-Z0-9.=^-]{0,19}$/.test(s))
  return [...new Set(symbols)].slice(0, MAX_SYMBOLS)
}

function watchedSymbols(): string[] {
  const all = data.profile.widgets
    .filter((widget) => widget.type === 'markets')
    .flatMap((widget) => parseSymbols(widget.settings['symbols']))
  return [...new Set(all)]
}

export function parseChart(symbol: string, json: unknown): MarketQuote | null {
  const result = (json as { chart?: { result?: Record<string, unknown>[] } })?.chart?.result?.[0]
  const meta = result?.['meta'] as Record<string, unknown> | undefined
  const price = meta?.['regularMarketPrice']
  const previous = meta?.['chartPreviousClose'] ?? meta?.['previousClose']
  if (typeof price !== 'number' || typeof previous !== 'number') return null
  const indicators = result?.['indicators'] as { quote?: { close?: unknown[] }[] } | undefined
  const closes = indicators?.quote?.[0]?.close ?? []
  return {
    symbol,
    name: String(meta?.['shortName'] ?? symbol).replace(/ (EUR|USD)$/, ''),
    price,
    previous,
    currency: typeof meta?.['currency'] === 'string' ? meta['currency'] : '',
    points: closes.filter((n): n is number => typeof n === 'number')
  }
}

async function download(symbol: string): Promise<boolean> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=15m`
    const response = await net.fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
    const quote = response.ok ? parseChart(symbol, await response.json()) : null
    if (!quote) throw new Error(`réponse ${response.status}`)
    quotes.set(symbol, quote)
    failed.delete(symbol)
    return true
  } catch (error) {
    console.warn(`[photon] cours illisible (${symbol}) : ${String(error)}`)
    failed.add(symbol)
    return false
  }
}

async function refreshAll(): Promise<void> {
  clearTimeout(timer)
  const symbols = watchedSymbols()
  for (const symbol of quotes.keys()) if (!symbols.includes(symbol)) quotes.delete(symbol)
  const results = await Promise.all(symbols.map(download))
  if (results.some(Boolean)) updatedAt = Date.now()
  timer = setTimeout(() => void refreshAll(), results.every(Boolean) ? REFRESH_MS : RETRY_MS)
}

export function startMarkets(): void {
  void refreshAll()
}

// Profil enregistré ou changé : un symbole nouveau est lu tout de suite (geste de l'utilisateur).
export function onMarketsProfile(): void {
  for (const symbol of watchedSymbols()) if (!quotes.has(symbol)) void download(symbol)
}

// Cache seulement : les symboles du widget, dans son ordre, ceux pas encore lus absents.
export function markets(raw: unknown): MarketFeed {
  const symbols = parseSymbols(raw)
  return {
    quotes: symbols.flatMap((s) => quotes.get(s) ?? []),
    missing: symbols.filter((s) => !quotes.has(s) && failed.has(s)),
    updatedAt
  }
}
