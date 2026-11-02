// Ports TCP en écoute (widget Ports) : « netstat -ano » (≈ 30 ms) + nom des processus lu par
// l'outil natif des processus. Fermer = le processus qui tient le port, jamais un protégé.
import { execFile } from 'node:child_process'
import type { PortInfo } from '../shared/api'
import { closable, closePids, processNames } from './processes'

const LISTEN = /^\s*TCP\s+(\S+):(\d+)\s+\S+\s+LISTENING\s+(\d+)\s*$/
const LOOPBACK = new Set(['127.0.0.1', '[::1]'])

// Un port par ligne et par processus ; « local » si toutes ses adresses sont la boucle locale.
export function parseNetstat(text: string): { port: number; pid: number; local: boolean }[] {
  const found = new Map<string, { port: number; pid: number; local: boolean }>()
  for (const line of text.split(/\r?\n/)) {
    const match = LISTEN.exec(line)
    if (!match) continue
    const [, address = '', portText = '', pidText = ''] = match
    const port = Number(portText)
    const pid = Number(pidText)
    const key = `${port}/${pid}`
    const local = LOOPBACK.has(address)
    const seen = found.get(key)
    found.set(key, { port, pid, local: (seen?.local ?? true) && local })
  }
  return [...found.values()].sort((a, b) => a.port - b.port || a.pid - b.pid)
}

// IPv4 et IPv6 ensemble (« -p TCP » ne donnerait que l'IPv4) ; les lignes UDP sont ignorées.
const netstat = (): Promise<string | null> =>
  new Promise((resolve) =>
    execFile('netstat', ['-ano'], { windowsHide: true, timeout: 5000 }, (error, out) =>
      resolve(error ? null : out)
    )
  )

let last: PortInfo[] = []

// null : netstat a échoué. pid 0 et 4 = Windows lui-même.
export async function ports(): Promise<PortInfo[] | null> {
  const [out, names] = await Promise.all([netstat(), processNames()])
  if (out === null) return null
  last = parseNetstat(out).map(({ port, pid, local }) => {
    const name = pid <= 4 ? 'System' : (names?.get(pid) ?? '')
    return { port, pid, name: name || `pid ${pid}`, local, closable: !!name && closable(name) }
  })
  return last
}

// Seulement un processus vu à la dernière lecture et fermable.
export async function portClose(pid: unknown): Promise<boolean> {
  const entry = last.find((p) => p.pid === pid)
  if (!entry?.closable || typeof pid !== 'number' || pid === process.pid) return false
  return closePids([pid], entry.name)
}
