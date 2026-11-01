// Fichiers et dossiers du dossier utilisateur pour la barre de commande. Windows Search est souvent
// coupé (c'est le cas ici) : index maison, scanné en fond au démarrage puis toutes les 30 min
// (~110 000 entrées en moins d'une seconde). Noms en mémoire seulement, jamais écrits sur disque.
import { app, shell } from 'electron'
import { statSync } from 'node:fs'
import { readdir, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, join } from 'node:path'
import { matchScore, normalize } from './rank'

const REFRESH_MS = 30 * 60_000
const MAX_ENTRIES = 300_000
const MAX_DEPTH = 8
// Dossiers techniques : des milliers de fichiers qu'on ne cherche jamais à la main.
const SKIP = new Set([
  'AppData',
  'node_modules',
  '$RECYCLE.BIN',
  '__pycache__',
  'venv',
  'Library',
  'bin',
  'obj',
  'dist',
  'out',
  'build',
  'anaconda3',
  'miniconda3',
  'site-packages',
  'webcache2',
  'Cache',
  'cache'
])

interface Entry {
  name: string
  key: string // nom normalisé, pour filtrer vite
  dir: number // index dans dirs
  folder: boolean
}

let dirs: string[] = []
let entries: Entry[] = []
let recent = new Map<string, number>() // chemin → date d'ouverture (fichiers récents de Windows)

export interface FileHit {
  path: string
  name: string
  folder: boolean
  score: number
}

async function scan(): Promise<void> {
  const nextDirs: string[] = []
  const nextEntries: Entry[] = []
  async function walk(dir: string, depth: number): Promise<void> {
    const list = await readdir(dir, { withFileTypes: true }).catch(() => [])
    const index = nextDirs.push(dir) - 1
    for (const e of list) {
      if (nextEntries.length >= MAX_ENTRIES) return
      if (e.name.startsWith('.') || SKIP.has(e.name)) continue
      const folder = e.isDirectory()
      nextEntries.push({ name: e.name, key: normalize(e.name), dir: index, folder })
      if (folder && depth < MAX_DEPTH) await walk(join(dir, e.name), depth + 1)
    }
  }
  await walk(homedir(), 0)
  dirs = nextDirs
  entries = nextEntries
  readRecent()
}

// Fichiers récents de Windows : raccourcis dans …\Recent, datés par leur dernière modification.
async function readRecentAsync(): Promise<void> {
  const folder = join(app.getPath('appData'), 'Microsoft', 'Windows', 'Recent')
  const list = await readdir(folder, { withFileTypes: true }).catch(() => [])
  const found: [string, number][] = []
  for (const e of list) {
    if (!e.isFile() || !e.name.endsWith('.lnk')) continue
    try {
      const link = join(folder, e.name)
      const { target } = shell.readShortcutLink(link)
      if (target) found.push([target, (await stat(link)).mtimeMs])
    } catch {
      // raccourci cassé
    }
  }
  recent = new Map(found.sort((a, b) => b[1] - a[1]))
}
let recentAt = 0
function readRecent(): void {
  recentAt = Date.now()
  void readRecentAsync()
}

export function startFiles(): void {
  void scan()
  setInterval(() => void scan(), REFRESH_MS)
}

// Correspondances dans le nom (pas de lettres éparpillées : trop de bruit sur 100 000 fichiers).
export function findFiles(query: string, limit: number): FileHit[] {
  if (Date.now() - recentAt > 60_000) readRecent() // pour la recherche suivante
  const q = normalize(query)
  if (!q) return []
  const hits: FileHit[] = []
  for (const entry of entries) {
    if (!entry.key.includes(q)) continue
    const path = join(dirs[entry.dir] ?? '', entry.name)
    const score = matchScore(entry.name, query) + (recent.has(path) ? 15 : 0)
    hits.push({ path, name: entry.name, folder: entry.folder, score })
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit)
}

// Derniers fichiers ouverts dans Windows, plus récents d'abord (barre vide).
export function recentFiles(limit: number): FileHit[] {
  const hits: FileHit[] = []
  for (const path of recent.keys()) {
    if (hits.length >= limit) break
    try {
      hits.push({ path, name: basename(path), folder: statSync(path).isDirectory(), score: 0 })
    } catch {
      // supprimé depuis : on l'ignore
    }
  }
  return hits
}
