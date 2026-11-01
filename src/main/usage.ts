// Usage de Claude Code (widget Usage Claude) : tokens lus dans ses journaux
// (.claude/projects/**/*.jsonl), côté Windows et dans les distributions WSL déjà allumées (jamais
// réveillées). Lecture incrémentale : seule la fin ajoutée d'un fichier est relue. Aucun réseau.
import { execFile } from 'node:child_process'
import { createReadStream, promises as fs } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { ClaudeUsage } from '../shared/api'

const WINDOW_MS = 5 * 3_600_000 // limites de Claude : fenêtres de 5 h
const WEEK_MS = 7 * 86_400_000
const HOUR_MS = 3_600_000
const WSL_CHECK_MS = 60_000
const USAGE = Buffer.from('"usage"')

export interface UsageEntry {
  time: number // ms
  tokens: number // entrée + sortie + écriture en cache (les lectures du cache ne comptent pas)
}

// Clé = réponse:requête : Claude Code écrit la même réponse plusieurs fois.
const entries = new Map<string, UsageEntry>()
const files = new Map<string, { offset: number; mtime: number }>()
let scanning: Promise<void> | null = null
let distros: { at: number; list: string[] } = { at: 0, list: [] }
let found = 0 // dossiers de journaux trouvés à la dernière lecture

const count = (v: unknown): number => (typeof v === 'number' && v > 0 ? v : 0)

export function parseLine(line: string): [string, UsageEntry] | null {
  try {
    const d = JSON.parse(line) as Record<string, unknown>
    const message = d['message'] as Record<string, unknown> | undefined
    const usage = message?.['usage'] as Record<string, unknown> | undefined
    const time = Date.parse(String(d['timestamp']))
    if (d['type'] !== 'assistant' || !usage || !Number.isFinite(time)) return null
    const tokens =
      count(usage['input_tokens']) +
      count(usage['output_tokens']) +
      count(usage['cache_creation_input_tokens'])
    return [`${String(message?.['id'])}:${String(d['requestId'])}`, { time, tokens }]
  } catch {
    return null
  }
}

// Fenêtre de 5 h : ouverte par le premier message après la fin de la précédente, arrondie à
// l'heure (comme le compte Claude). null si aucune fenêtre n'est en cours.
export function summarize(list: UsageEntry[], now: number): Omit<ClaudeUsage, 'sources'> {
  const sorted = list.filter((e) => e.time > now - WEEK_MS).sort((a, b) => a.time - b.time)
  const midnight = new Date(now).setHours(0, 0, 0, 0)
  let start = -Infinity
  let session = 0
  let messages = 0
  let today = 0
  let week = 0
  for (const e of sorted) {
    if (e.time >= start + WINDOW_MS) {
      start = Math.floor(e.time / HOUR_MS) * HOUR_MS
      session = 0
      messages = 0
    }
    session += e.tokens
    messages++
    week += e.tokens
    if (e.time >= midnight) today += e.tokens
  }
  const open = now < start + WINDOW_MS
  return {
    session: open ? session : 0,
    messages: open ? messages : 0,
    resetsAt: open ? start + WINDOW_MS : null,
    today,
    week
  }
}

// Distributions WSL allumées (docker-desktop exclu) : lire leurs fichiers ne les réveille pas.
function runningDistros(): Promise<string[]> {
  if (Date.now() - distros.at < WSL_CHECK_MS) return Promise.resolve(distros.list)
  return new Promise((resolve) => {
    execFile(
      'wsl.exe',
      ['-l', '--running', '-q'],
      { encoding: 'utf16le', windowsHide: true, timeout: 5_000 },
      (error, stdout) => {
        const list = error
          ? []
          : stdout
              .split(/\r?\n/)
              .map((name) => name.replace(/^\uFEFF/, '').trim())
              .filter((name) => /^[\w.-]+$/.test(name) && !name.startsWith('docker-desktop'))
        distros = { at: Date.now(), list }
        resolve(list)
      }
    )
  })
}

async function roots(): Promise<string[]> {
  const homes = [homedir()]
  for (const distro of await runningDistros()) {
    const base = `\\\\wsl.localhost\\${distro}`
    const users = await fs.readdir(`${base}\\home`).catch(() => [] as string[])
    homes.push(...users.map((user) => `${base}\\home\\${user}`), `${base}\\root`)
  }
  return homes.flatMap((home) => [
    join(home, '.claude', 'projects'),
    join(home, '.config', 'claude', 'projects')
  ])
}

// Lit ce qui a été ajouté depuis la dernière fois, lignes complètes seulement.
async function readNew(path: string, size: number, mtime: number): Promise<void> {
  const known = files.get(path)
  if (known?.mtime === mtime && known.offset === size) return
  let offset = known && known.offset <= size ? known.offset : 0 // fichier raccourci : tout relire
  let rest: Buffer = Buffer.alloc(0)
  for await (const chunk of createReadStream(path, { start: offset })) {
    const data = rest.length ? Buffer.concat([rest, chunk as Buffer]) : (chunk as Buffer)
    let start = 0
    let end: number
    while ((end = data.indexOf(10, start)) !== -1) {
      const hit = data.indexOf(USAGE, start)
      if (hit !== -1 && hit < end) {
        const entry = parseLine(data.toString('utf8', start, end))
        if (entry) entries.set(...entry)
      }
      start = end + 1
    }
    offset += start
    rest = data.subarray(start)
  }
  files.set(path, { offset, mtime })
}

async function scan(): Promise<void> {
  const since = Date.now() - WEEK_MS
  let dirs = 0
  for (const root of await roots()) {
    const names = await fs.readdir(root, { recursive: true }).catch(() => null)
    if (!names) continue
    dirs++
    for (const name of names) {
      if (!name.endsWith('.jsonl')) continue
      const path = join(root, name)
      try {
        const stat = await fs.stat(path)
        if (stat.mtimeMs >= since) await readNew(path, stat.size, stat.mtimeMs)
      } catch {
        // fichier supprimé ou verrouillé pendant la lecture : réessayé au tour suivant
      }
    }
  }
  found = dirs
  for (const [key, e] of entries) if (e.time < since) entries.delete(key)
}

// 1re lecture : plusieurs secondes si les journaux sont gros ; ensuite quelques ms.
export async function claudeUsage(): Promise<ClaudeUsage> {
  scanning ??= scan().finally(() => (scanning = null))
  await scanning
  return { ...summarize([...entries.values()], Date.now()), sources: found }
}
