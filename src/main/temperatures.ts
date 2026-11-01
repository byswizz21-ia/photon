// Températures CPU / GPU et charge GPU pour le widget Système.
// GPU : nvidia-smi (livré avec le pilote NVIDIA, ≈ 70 ms, sans droits admin).
// CPU : Windows ne la donne pas sans pilote noyau (zones ACPI figées, WMI réservé à l'admin) :
// on lit LibreHardwareMonitor s'il tourne avec son serveur web local (127.0.0.1, jamais Internet).
import { execFile } from 'node:child_process'
import type { Temperatures } from '../shared/api'

const LHM_URL = 'http://127.0.0.1:8085/data.json' // port par défaut de LibreHardwareMonitor
const TIMEOUT_MS = 1500
const SHARE_MS = 1000 // plusieurs widgets Système : une seule mesure par seconde

export interface Gpu {
  temp: number | null
  load: number | null
}

// Sortie « 50, 5 » (temp °C, charge %) ; 1re carte seulement. « [N/A] » → null.
export function parseNvidiaSmi(stdout: string): Gpu | null {
  const line = stdout.trim().split(/\r?\n/)[0]
  if (!line) return null
  const [temp, load] = line.split(',').map((part) => {
    const value = Number.parseFloat(part)
    return Number.isFinite(value) ? value : null
  })
  return temp === undefined ? null : { temp, load: load ?? null }
}

interface LhmNode {
  Text?: string
  Value?: string
  RawValue?: number
  SensorId?: string
  Children?: LhmNode[]
}

// Capteurs de l'arbre LHM dont l'id ressemble à « /intelcpu/0/temperature/3 ».
function sensors(node: LhmNode, out: LhmNode[] = []): LhmNode[] {
  if (node.SensorId) out.push(node)
  for (const child of node.Children ?? []) sensors(child, out)
  return out
}

// RawValue (nombre) dans les versions récentes, sinon Value formatée selon la langue : « 45,0 °C ».
function celsius(sensor: LhmNode): number | null {
  const value =
    typeof sensor.RawValue === 'number'
      ? sensor.RawValue
      : Number.parseFloat((sensor.Value ?? '').replace(',', '.'))
  return Number.isFinite(value) && value > 0 ? value : null
}

// Capteur préféré par nom (Intel : « CPU Package », AMD : « Core (Tctl/Tdie) »), sinon le plus chaud.
const PREFERRED = ['cpu package', 'core (tctl/tdie)', 'core max', 'gpu core']

function pick(temps: LhmNode[]): number | null {
  const named = PREFERRED.map((name) =>
    temps.find((sensor) => sensor.Text?.toLowerCase() === name)
  ).find((sensor) => sensor && celsius(sensor) !== null)
  if (named) return celsius(named)
  const values = temps.map(celsius).filter((value) => value !== null)
  return values.length ? Math.max(...values) : null
}

export function parseLhm(root: LhmNode): { cpu: number | null; gpu: number | null } {
  const temps = sensors(root).filter((sensor) => sensor.SensorId?.includes('/temperature/'))
  const of = (prefix: RegExp): number | null =>
    pick(temps.filter((sensor) => prefix.test(sensor.SensorId ?? '')))
  return { cpu: of(/^\/(intel|amd)cpu\//), gpu: of(/^\/gpu-/) }
}

function nvidiaSmi(): Promise<Gpu | null> {
  return new Promise((resolve) => {
    execFile(
      'nvidia-smi.exe',
      ['--query-gpu=temperature.gpu,utilization.gpu', '--format=csv,noheader,nounits'],
      { windowsHide: true, timeout: TIMEOUT_MS },
      (error, stdout) => resolve(error ? null : parseNvidiaSmi(stdout)) // pas de carte NVIDIA
    )
  })
}

async function lhm(): Promise<{ cpu: number | null; gpu: number | null } | null> {
  try {
    const response = await fetch(LHM_URL, { signal: AbortSignal.timeout(TIMEOUT_MS) })
    return response.ok ? parseLhm((await response.json()) as LhmNode) : null
  } catch {
    return null // LHM fermé ou serveur web désactivé
  }
}

async function measure(): Promise<Temperatures> {
  const [gpu, lhmTemps] = await Promise.all([nvidiaSmi(), lhm()])
  return {
    cpu: lhmTemps?.cpu ?? null,
    gpu: gpu?.temp ?? lhmTemps?.gpu ?? null,
    gpuLoad: gpu?.load ?? null,
    lhm: lhmTemps !== null
  }
}

let last: { at: number; value: Promise<Temperatures> } | null = null

export function temperatures(): Promise<Temperatures> {
  if (!last || Date.now() - last.at > SHARE_MS) last = { at: Date.now(), value: measure() }
  return last.value
}
