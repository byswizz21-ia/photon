// Barre de commande : un texte → résultats mélangés (calcul, apps, commandes, fichiers, site),
// classés par correspondance + habitudes, puis « Rechercher sur Google » et « Demander à Claude ».
// Préfixes : « ? » Claude, « > » commandes, « / » fichiers. L'interface ne reçoit que des
// identifiants : ouvrir un résultat = retrouver ici l'action de la dernière recherche.
import { app, clipboard, shell } from 'electron'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import type { SearchResult } from '../../shared/api'
import { readJson, writeJson } from '../store'
import { fileIcon, launch } from '../system'
import { launchStoreApp, listApps, startApps, type AppEntry } from './apps'
import { calculate } from './calc'
import { COMMANDS, type Command } from './commands'
import { findFiles, recentFiles, startFiles, type FileHit } from './files'
import { matchScore, usageBoost, type Usage } from './rank'

const MAX_RESULTS = 8
const MAX_QUERY = 200
const MAX_USAGE = 2_000

interface Candidate extends SearchResult {
  key: string // clé des habitudes : même app = même clé d'une recherche à l'autre
  score: number
  path: string | null // pour l'icône et « ouvrir le dossier »
  run: (inFolder: boolean) => Promise<boolean> | boolean
}

let current = new Map<string, Candidate>()
let usage: Record<string, Usage> = {}
const icons = new Map<string, string | null>()

const usageFile = (): string => join(app.getPath('userData'), 'usage.json')

function parseUsage(raw: unknown): Record<string, Usage> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw))
    throw new Error('objet attendu')
  const result: Record<string, Usage> = {}
  for (const [key, v] of Object.entries(raw as Record<string, unknown>)) {
    const u = v as Partial<Usage> | null
    if (typeof u?.count === 'number' && typeof u.last === 'number') {
      result[key] = { count: u.count, last: u.last }
    }
  }
  return result
}

export async function loadSearch(): Promise<void> {
  usage = await readJson(usageFile(), parseUsage, () => ({}))
  startApps()
  startFiles()
}

function remember(key: string): void {
  usage[key] = { count: (usage[key]?.count ?? 0) + 1, last: Date.now() }
  const keys = Object.keys(usage)
  if (keys.length > MAX_USAGE) {
    // Les plus anciennes habitudes partent en premier.
    for (const old of keys
      .sort((a, b) => usage[a]!.last - usage[b]!.last)
      .slice(0, keys.length - MAX_USAGE)) {
      delete usage[old]
    }
  }
  void writeJson(usageFile(), usage, parseUsage)
}

// « C:\Users\caca\Documents\x » → « ~\Documents »
const shortDir = (path: string): string => dirname(path).replace(homedir(), '~')

const showInFolder = (path: string): boolean => {
  shell.showItemInFolder(path)
  return true
}

function appCandidate(entry: AppEntry, score: number): Candidate {
  const key = `app:${entry.path ?? entry.appId ?? ''}`
  return {
    id: key,
    key,
    kind: 'app',
    title: entry.name,
    subtitle: 'Application',
    confirm: false,
    score: score + 15, // une app passe devant un fichier au nom proche
    path: entry.path,
    run: (inFolder) => {
      if (entry.path) return inFolder ? showInFolder(entry.path) : launch(entry.path)
      if (entry.appId) launchStoreApp(entry.appId)
      return Boolean(entry.appId)
    }
  }
}

function fileCandidate(hit: FileHit): Candidate {
  const key = `file:${hit.path}`
  return {
    id: key,
    key,
    kind: hit.folder ? 'folder' : 'file',
    title: hit.name,
    subtitle: shortDir(hit.path),
    confirm: false,
    score: hit.score + (hit.folder ? 3 : 0),
    path: hit.path,
    run: (inFolder) => (inFolder ? showInFolder(hit.path) : launch(hit.path))
  }
}

function commandCandidate(command: Command, score: number): Candidate {
  const key = `${command.ui ? 'ui' : 'cmd'}:${command.id}`
  return {
    id: key,
    key,
    kind: command.ui ? 'action' : 'command',
    title: command.title,
    subtitle: command.confirm ? 'Commande · Entrée deux fois' : 'Commande',
    confirm: command.confirm,
    score,
    path: null,
    run: () => {
      command.run()
      return !command.ui
    }
  }
}

const fixed = (
  id: string,
  kind: SearchResult['kind'],
  title: string,
  subtitle: string,
  run: Candidate['run']
): Candidate => ({ id, key: id, kind, title, subtitle, confirm: false, score: 0, path: null, run })

// « ytb.com », « github.com/x », « https://… » : un site plutôt qu'une recherche.
const SITE = /^(https?:\/\/)?[\w-]+(\.[\w-]+)*\.[a-z]{2,}(:\d+)?(\/\S*)?$/i

function siteCandidate(text: string): Candidate | null {
  if (!SITE.test(text)) return null
  const url = /^https?:\/\//i.test(text) ? text : `https://${text}`
  return fixed(`site:${url}`, 'site', text, 'Ouvrir le site', async () => {
    await shell.openExternal(url)
    return true
  })
}

const NUMBER = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 10 })

function calcCandidate(text: string): Candidate | null {
  const value = calculate(text)
  if (value === null) return null
  const result = fixed(
    'calc',
    'calc',
    `= ${NUMBER.format(value)}`,
    'Entrée copie le résultat',
    () => {
      clipboard.writeText(String(value))
      return true
    }
  )
  return { ...result, score: 1_000 }
}

const claudeRow = (text: string): Candidate =>
  fixed(
    'claude',
    'claude',
    text ? `Demander à Claude : « ${text} »` : 'Demander à Claude',
    'Tab',
    () => false
  )

// Barre vide : habitudes les plus fortes, puis derniers fichiers ouverts dans Windows.
function favorites(now: number): Candidate[] {
  const known = new Map<string, Candidate>()
  for (const entry of listApps())
    known.set(`app:${entry.path ?? entry.appId ?? ''}`, appCandidate(entry, 0))
  for (const command of COMMANDS) {
    const candidate = commandCandidate(command, 0)
    known.set(candidate.key, candidate)
  }
  const top = Object.entries(usage)
    .sort((a, b) => usageBoost(b[1], now) - usageBoost(a[1], now))
    .map(([key]) => {
      if (key.startsWith('file:')) {
        const path = key.slice(5)
        return existsSync(path)
          ? fileCandidate({ path, name: basename(path), folder: false, score: 0 })
          : null
      }
      return known.get(key) ?? null
    })
    .filter((c): c is Candidate => c !== null)
    .slice(0, MAX_RESULTS)
  const seen = new Set(top.map((c) => c.key))
  const recents = recentFiles(MAX_RESULTS * 2)
    .filter((hit) => !seen.has(`file:${hit.path}`))
    .map(fileCandidate)
  return [...top, ...recents].slice(0, MAX_RESULTS)
}

function collect(query: string): Candidate[] {
  const now = Date.now()
  const first = query[0] ?? ''
  const prefix = '?>/'.includes(first) ? first : '' // '' : recherche partout
  const text = (prefix ? query.slice(1) : query).trim()
  if (prefix === '?') return [claudeRow(text)]
  if (!text) return prefix ? [] : favorites(now)

  const found: Candidate[] = []
  const boost = (c: Candidate): Candidate => ({
    ...c,
    score: c.score + usageBoost(usage[c.key], now)
  })
  if (prefix !== '/') {
    for (const command of COMMANDS) {
      if (command.available && !command.available()) continue
      const score = Math.max(
        matchScore(command.title, text, true),
        matchScore(command.keywords, text)
      )
      if (score) found.push(boost(commandCandidate(command, score)))
    }
  }
  if (!prefix) {
    for (const entry of listApps()) {
      const score = matchScore(entry.name, text, true)
      if (score) found.push(boost(appCandidate(entry, score)))
    }
  }
  if (prefix !== '>') {
    for (const hit of findFiles(text, 50)) found.push(boost(fileCandidate(hit)))
  }
  const calc = prefix ? null : calcCandidate(text)
  const site = prefix ? null : siteCandidate(text)
  const ranked = found.sort((a, b) => b.score - a.score).slice(0, MAX_RESULTS)
  if (prefix === '>' || prefix === '/') return ranked
  const web = fixed('web', 'web', `Rechercher « ${text} » sur Google`, 'Navigateur', async () => {
    await shell.openExternal(`https://www.google.com/search?q=${encodeURIComponent(text)}`)
    return true
  })
  return [calc, site, ...ranked, web, claudeRow(text)].filter((c): c is Candidate => c !== null)
}

export function search(raw: unknown): SearchResult[] {
  const query = typeof raw === 'string' ? raw.slice(0, MAX_QUERY) : ''
  const results = collect(query)
  current = new Map(results.map((c) => [c.id, c]))
  return results.map(({ id, kind, title, subtitle, confirm }) => ({
    id,
    kind,
    title,
    subtitle,
    confirm
  }))
}

// true : ouvert (Photon peut se cacher). Résultats de la dernière recherche seulement.
export async function openResult(id: unknown, inFolder: unknown): Promise<boolean> {
  const candidate = typeof id === 'string' ? current.get(id) : undefined
  if (!candidate) return false
  const opened = await candidate.run(inFolder === true)
  if (opened && candidate.kind !== 'calc') remember(candidate.key)
  return opened
}

// Icône d'un résultat (app, fichier, dossier), gardée en mémoire.
export async function resultIcon(id: unknown): Promise<string | null> {
  const path = typeof id === 'string' ? current.get(id)?.path : null
  if (!path) return null
  if (!icons.has(path)) {
    if (icons.size > 1_000) icons.clear()
    icons.set(path, await fileIcon(path))
  }
  return icons.get(path) ?? null
}
