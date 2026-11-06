// Cours des widgets Cours (crypto, actions, indices) : Yahoo Finance, sans clé. Lus en fond
// (démarrage, puis toutes les 5 min), jamais à l'ouverture de Photon. L'interface ne lit que le
// cache. Symboles Yahoo : BTC-EUR, ETH-USD, AAPL, MC.PA, ^FCHI…
// Designs détaillés (Vedette, Marché) : historique 5 jours, 1 mois, 1 an en plus, relu toutes les heures.
import { net } from 'electron'
import {
  DEFAULT_MARKET_SYMBOLS,
  type MarketFeed,
  type MarketQuote,
  type MarketSeries
} from '../shared/api'
import { data } from './data'

const REFRESH_MS = 5 * 60_000
const RETRY_MS = 60_000
const TIMEOUT_MS = 10_000
const MAX_SYMBOLS = 8
const HISTORY_MS = 60 * 60_000
const DETAILED = ['spot', 'market'] // designs du widget qui montrent l'historique
const RANGES = {
  '5J': 'range=5d&interval=30m',
  '1M': 'range=1mo&interval=90m',
  '1A': 'range=1y&interval=1d'
} as const
type HistoryRange = keyof typeof RANGES

const quotes = new Map<string, MarketQuote>()
const failed = new Set<string>() // dernière lecture en échec (le cours précédent reste affiché)
const history = new Map<string, { at: number; ranges: MarketQuote['history'] }>()
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

// Widget jamais réglé (réglages vides) : il affiche les symboles par défaut, on les lit donc aussi.
// detailed : seulement les widgets en design Vedette ou Marché.
export function watchedSymbols(detailed = false): string[] {
  const all = data.profile.widgets
    .filter(
      (widget) =>
        widget.type === 'markets' &&
        (!detailed || DETAILED.includes(String(widget.settings['design'])))
    )
    .flatMap((widget) => {
      const symbols = widget.settings['symbols']
      return parseSymbols(typeof symbols === 'string' ? symbols : DEFAULT_MARKET_SYMBOLS)
    })
  return [...new Set(all)]
}

// Points sans cours (null) retirés avec leur heure.
function series(result: Record<string, unknown> | undefined): MarketSeries {
  const stamps = (result?.['timestamp'] as unknown[] | undefined) ?? []
  const indicators = result?.['indicators'] as { quote?: { close?: unknown[] }[] } | undefined
  const closes = indicators?.quote?.[0]?.close ?? []
  const points: number[] = []
  const times: number[] = []
  closes.forEach((close, i) => {
    const at = stamps[i]
    if (typeof close !== 'number') return
    points.push(close)
    times.push(typeof at === 'number' ? at * 1000 : 0)
  })
  return { points, times }
}

const KINDS: Record<string, MarketQuote['kind']> = { CRYPTOCURRENCY: 'crypto', INDEX: 'index' }

function session(meta: Record<string, unknown> | undefined): MarketQuote['session'] {
  const period = meta?.['currentTradingPeriod'] as
    Record<string, Record<string, unknown>> | undefined
  const { start, end, gmtoffset } = period?.['regular'] ?? {}
  if (typeof start !== 'number' || typeof end !== 'number') return null
  const zone = meta?.['exchangeTimezoneName']
  return {
    start: start * 1000,
    end: end * 1000,
    offset: Number(gmtoffset ?? 0) * 1000,
    ...(typeof zone === 'string' && zone.length < 64 ? { zone } : {})
  }
}

// « Bitcoin EUR » → « Bitcoin », « Apple Inc. » → « Apple », « NVIDIA Corporation » → « NVIDIA ».
const shortName = (name: string): string =>
  name
    .replace(/ (EUR|USD)$/, '')
    .replace(/,? (Inc\.?|Corporation|Corp\.?|S\.?A\.?|SE|plc|N\.V\.)$/i, '')

export function parseChart(symbol: string, json: unknown): MarketQuote | null {
  const result = (json as { chart?: { result?: Record<string, unknown>[] } })?.chart?.result?.[0]
  const meta = result?.['meta'] as Record<string, unknown> | undefined
  const price = meta?.['regularMarketPrice']
  const previous = meta?.['chartPreviousClose'] ?? meta?.['previousClose']
  if (typeof price !== 'number' || typeof previous !== 'number') return null
  const time = meta?.['regularMarketTime']
  return {
    symbol,
    name: shortName(String(meta?.['shortName'] ?? symbol)),
    price,
    previous,
    currency: typeof meta?.['currency'] === 'string' ? meta['currency'] : '',
    time: typeof time === 'number' ? time * 1000 : Date.now(),
    kind: KINDS[String(meta?.['instrumentType'])] ?? 'stock',
    exchange: String(meta?.['fullExchangeName'] ?? meta?.['exchangeName'] ?? ''),
    session: session(meta),
    history: {},
    ...series(result)
  }
}

async function chart(symbol: string, query: string): Promise<unknown> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?${query}`
  const response = await net.fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!response.ok) throw new Error(`réponse ${response.status}`)
  return response.json()
}

// Historique d'un symbole : une période illisible est seulement absente.
async function downloadHistory(symbol: string): Promise<void> {
  const ranges: MarketQuote['history'] = {}
  await Promise.all(
    (Object.keys(RANGES) as HistoryRange[]).map(async (range) => {
      try {
        const line = series(
          (
            (await chart(symbol, RANGES[range])) as {
              chart?: { result?: Record<string, unknown>[] }
            }
          )?.chart?.result?.[0]
        )
        if (line.points.length > 1) ranges[range] = line
      } catch (error) {
        console.warn(`[photon] historique illisible (${symbol} ${range}) : ${String(error)}`)
      }
    })
  )
  // Tout illisible : nouvel essai au prochain rafraîchissement plutôt que dans une heure.
  const at = Object.keys(ranges).length ? Date.now() : Date.now() - HISTORY_MS + RETRY_MS
  history.set(symbol, { at, ranges })
}

async function download(symbol: string): Promise<boolean> {
  try {
    const quote = parseChart(symbol, await chart(symbol, 'range=1d&interval=5m'))
    if (!quote) throw new Error('réponse sans cours')
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
  for (const symbol of history.keys()) if (!symbols.includes(symbol)) history.delete(symbol)
  const old = watchedSymbols(true).filter(
    (s) => Date.now() - (history.get(s)?.at ?? 0) > HISTORY_MS
  )
  old.forEach(loadHistory) // à part : un historique lent ne retarde pas les cours
  const results = await Promise.all(symbols.map(download))
  if (results.some(Boolean)) updatedAt = Date.now()
  timer = setTimeout(() => void refreshAll(), results.every(Boolean) ? REFRESH_MS : RETRY_MS)
}

export function startMarkets(): void {
  void refreshAll()
}

// Profil enregistré ou changé : un symbole nouveau est lu tout de suite (geste de l'utilisateur).
// Déjà en échec ou en cours de lecture : rien (chaque déplacement de widget enregistre le profil).
const pending = new Set<string>()

export function onMarketsProfile(): void {
  for (const symbol of watchedSymbols()) {
    if (quotes.has(symbol) || failed.has(symbol) || pending.has(symbol)) continue
    pending.add(symbol)
    void download(symbol).finally(() => pending.delete(symbol))
  }
  // Design détaillé choisi : son historique tout de suite.
  for (const symbol of watchedSymbols(true)) if (!history.has(symbol)) loadHistory(symbol)
}

// Historique d'un symbole, une seule lecture à la fois (profil changé et rafraîchissement).
function loadHistory(symbol: string): void {
  const key = `history:${symbol}`
  if (pending.has(key)) return
  pending.add(key)
  void downloadHistory(symbol).finally(() => pending.delete(key))
}

// Cache seulement : les symboles du widget, dans son ordre, ceux pas encore lus absents.
export function markets(raw: unknown): MarketFeed {
  const symbols = parseSymbols(raw)
  return {
    quotes: symbols.flatMap((s) => {
      const quote = quotes.get(s)
      return quote ? [{ ...quote, history: history.get(s)?.ranges ?? {} }] : []
    }),
    missing: symbols.filter((s) => !quotes.has(s) && failed.has(s)),
    updatedAt
  }
}
