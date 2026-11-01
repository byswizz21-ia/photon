// Volume et sortie audio de Windows, via l'outil natif audio.cs gardé ouvert dans un PowerShell :
// compilé une fois (≈ 0,6 s), puis ≈ 5 ms par commande. Lancé au premier usage seulement ; il
// s'arrête tout seul à la fermeture de Photon (son entrée standard se ferme).
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { createInterface } from 'node:readline'
import type { AudioState } from '../shared/api'
import source from './audio.cs?raw'

const TIMEOUT_MS = 10_000 // outil bloqué : on le relance à la commande suivante

const SCRIPT = `[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
Add-Type -TypeDefinition @'
${source}
'@
while ($null -ne ($line = [Console]::In.ReadLine())) { [Console]::Out.WriteLine([Photon.Audio]::Run($line)) }`

let child: ChildProcessWithoutNullStreams | null = null
const waiting: ((line: string | null) => void)[] = [] // une réponse par ligne, dans l'ordre
let last: AudioState | null = null

function helper(): ChildProcessWithoutNullStreams {
  if (child) return child
  const proc = spawn(
    'powershell.exe',
    [
      '-NoProfile',
      '-NonInteractive',
      '-EncodedCommand',
      Buffer.from(SCRIPT, 'utf16le').toString('base64')
    ],
    { windowsHide: true }
  )
  const stop = (): void => {
    if (child === proc) child = null
    for (const reply of waiting.splice(0)) reply(null)
  }
  proc.on('exit', stop)
  proc.on('error', stop)
  proc.stdin.on('error', () => {}) // outil déjà fermé : la réponse arrive à null par stop()
  createInterface({ input: proc.stdout }).on('line', (line) => waiting.shift()?.(line))
  child = proc
  return proc
}

function parse(line: string | null): AudioState | null {
  try {
    const raw = JSON.parse(line ?? 'null') as Partial<AudioState> & { error?: string }
    if (raw?.error) console.warn(`[photon] son : ${raw.error}`)
    if (typeof raw?.volume !== 'number' || !Array.isArray(raw.devices)) return null
    last = raw as AudioState
    return last
  } catch {
    return null
  }
}

function send(command: string): Promise<AudioState | null> {
  return new Promise((resolve) => {
    const proc = helper()
    const timer = setTimeout(() => proc.kill(), TIMEOUT_MS)
    waiting.push((line) => {
      clearTimeout(timer)
      resolve(parse(line))
    })
    proc.stdin.write(`${command}\n`)
  })
}

// null : outil indisponible (lecture suivante = nouvel essai).
export const audio = (): Promise<AudioState | null> => send('state')

export const audioVolume = (volume: unknown): Promise<AudioState | null> | null =>
  typeof volume === 'number' && Number.isFinite(volume)
    ? send(`volume ${Math.round(Math.min(100, Math.max(0, volume)))}`)
    : null

export const audioMute = (muted: unknown): Promise<AudioState | null> | null =>
  typeof muted === 'boolean' ? send(`mute ${muted ? 1 : 0}`) : null

// Seulement une sortie de la dernière liste lue : rien d'arbitraire n'atteint l'outil.
export const audioDevice = (id: unknown): Promise<AudioState | null> | null =>
  last?.devices.some((d) => d.id === id) ? send(`device ${id as string}`) : null

export async function toggleMute(): Promise<void> {
  const state = await audio()
  if (state) await audioMute(!state.muted)
}

// Sorties connues (dernière lecture), pour la barre de commande ; la 1re recherche les lit.
export function audioOutputs(): AudioState | null {
  if (!last && !child) void audio()
  return last
}
