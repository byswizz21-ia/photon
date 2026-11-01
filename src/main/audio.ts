// Volume et sortie audio de Windows, via l'outil natif audio.cs (src/main/native.ts) :
// ≈ 5 ms par commande, lancé au premier usage seulement.
import type { AudioState } from '../shared/api'
import source from './audio.cs?raw'
import { nativeTool } from './native'

const tool = nativeTool(source, 'Photon.Audio')
let last: AudioState | null = null

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

const send = async (command: string): Promise<AudioState | null> => parse(await tool.send(command))

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
let reading: Promise<unknown> | null = null

export function audioOutputs(): AudioState | null {
  reading ??= last ? null : audio().finally(() => (reading = null))
  return last
}
