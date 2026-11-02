// Processus gourmands (widget Processus), via l'outil natif processes.cs (src/main/native.ts).
// Processus regroupés par nom (Chrome = des dizaines de processus) ; CPU = part du temps de tous
// les cœurs depuis la lecture précédente, comme le Gestionnaire des tâches.
import { cpus } from 'node:os'
import type { ProcessGroup } from '../shared/api'
import source from './processes.cs?raw'
import { nativeTool } from './native'
import { fileIcon } from './system'

const tool = nativeTool(source, 'Photon.Processes')

const TOP = 10
const SHARE_MS = 1000 // plusieurs widgets : même mesure
const STALE_MS = 5000 // Photon était caché : mesure précédente périmée
const FRESH_MS = 500

// Jamais proposés à la fermeture : Windows lui-même, la machine virtuelle de WSL, l'antivirus, et
// Photon (dev : electron).
const PROTECTED = new Set(
  [
    'System',
    'Registry',
    'smss',
    'csrss',
    'wininit',
    'winlogon',
    'services',
    'lsass',
    'LsaIso',
    'svchost',
    'dwm',
    'fontdrvhost',
    'Memory Compression',
    'Secure System',
    'explorer',
    'sihost',
    'ctfmon',
    'audiodg',
    'vmmem',
    'vmmemWSL',
    'vmcompute',
    'MsMpEng',
    'SecurityHealthService',
    'Photon',
    'electron'
  ].map((name) => name.toLowerCase())
)

export const closable = (name: string): boolean => !PROTECTED.has(name.toLowerCase())

interface Proc {
  name: string
  cpu: number // ms de temps CPU cumulé
  memory: number // octets
}

export interface Snapshot {
  at: number
  procs: Map<number, Proc>
}

// Réponse de « list » : [[pid, nom, cpu, ram], …] ; null si illisible.
export function parseList(raw: string | null, at: number): Snapshot | null {
  try {
    const rows = JSON.parse(raw ?? 'null') as unknown
    if (!Array.isArray(rows)) return null
    const procs = new Map<number, Proc>()
    for (const row of rows) {
      if (!Array.isArray(row)) continue
      const [pid, name, cpu, memory] = row as unknown[]
      if (typeof pid === 'number' && typeof name === 'string' && typeof cpu === 'number') {
        procs.set(pid, { name, cpu, memory: typeof memory === 'number' ? memory : 0 })
      }
    }
    return { at, procs }
  } catch {
    return null
  }
}

// Groupes par nom entre deux lectures. Un processus né entre les deux ne compte que pour la RAM.
export function groups(before: Snapshot, after: Snapshot, cores: number): ProcessGroup[] {
  const span = Math.max(1, after.at - before.at) * Math.max(1, cores)
  const byName = new Map<string, ProcessGroup>()
  for (const [pid, proc] of after.procs) {
    const group = byName.get(proc.name) ?? {
      name: proc.name,
      label: proc.name,
      count: 0,
      cpu: 0,
      memory: 0,
      closable: closable(proc.name)
    }
    const old = before.procs.get(pid)
    if (old && old.name === proc.name && proc.cpu >= old.cpu) {
      group.cpu += ((proc.cpu - old.cpu) / span) * 100
    }
    group.count++
    group.memory += proc.memory
    byName.set(proc.name, group)
  }
  return [...byName.values()].map((g) => ({ ...g, cpu: Math.min(100, g.cpu) }))
}

let last: Snapshot | null = null
let shared: { at: number; value: Promise<ProcessGroup[] | null> } | null = null

const snapshot = async (): Promise<Snapshot | null> =>
  parseList(await tool.send('list'), Date.now())

async function measure(): Promise<ProcessGroup[] | null> {
  if (!last || Date.now() - last.at > STALE_MS) {
    last = await snapshot()
    await new Promise((resolve) => setTimeout(resolve, FRESH_MS))
  }
  const next = await snapshot()
  if (!next || !last) return null
  const result = groups(last, next, cpus().length)
  last = next
  return result
}

// Chemin et nom lisible (« Google Chrome ») de chaque exécutable, lus une fois par nom.
const infos = new Map<string, { path: string; desc: string }>()

async function describe(name: string): Promise<void> {
  if (infos.has(name) || !last) return
  const pid = [...last.procs].find(([, proc]) => proc.name === name)?.[0]
  if (pid === undefined) return
  try {
    const info = JSON.parse((await tool.send(`info ${pid}`)) ?? 'null') as {
      path?: unknown
      desc?: unknown
    } | null
    infos.set(name, {
      path: typeof info?.path === 'string' ? info.path : '',
      desc: typeof info?.desc === 'string' ? info.desc.trim() : ''
    })
  } catch {
    infos.set(name, { path: '', desc: '' })
  }
}

// Les plus gourmands en CPU ou en RAM ; null si l'outil natif ne répond pas.
export async function processes(sort: unknown): Promise<ProcessGroup[] | null> {
  if (!shared || Date.now() - shared.at > SHARE_MS) shared = { at: Date.now(), value: measure() }
  const all = await shared.value
  if (!all) return null
  const key = sort === 'ram' ? 'memory' : 'cpu'
  const top = all.sort((a, b) => b[key] - a[key] || b.memory - a.memory).slice(0, TOP)
  for (const group of top) await describe(group.name)
  return top.map((g) => ({ ...g, label: infos.get(g.name)?.desc || g.name }))
}

export async function processIcon(name: unknown): Promise<string | null> {
  if (typeof name !== 'string') return null
  const path = infos.get(name)?.path
  return path ? fileIcon(path) : null
}

// Ferme tous les processus d'un nom de la dernière lecture (jamais un nom protégé).
export async function processClose(name: unknown): Promise<boolean> {
  if (typeof name !== 'string' || !closable(name) || !last) return false
  const pids = [...last.procs].filter(([, proc]) => proc.name === name).map(([pid]) => pid)
  if (!pids.length) return false
  const reply = await tool.send(`close ${pids.join(',')}`)
  if (reply !== 'closed' && reply !== 'killed') console.warn(`[photon] fermeture refusée : ${name}`)
  return reply === 'closed' || reply === 'killed'
}
