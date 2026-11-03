// Ambiances à fichiers : un .ogg (Opus) par son, rangés par ambiance. Chargés à la demande
// (un petit module par fichier, inclus dans l'app : aucun accès réseau), décodés une fois.
// Sources : kits SND de Dentsu (snd.dev : Onde, Piano, Industriel) et Kenney (CC0, Tactile).
// Découpés, normalisés et encodés depuis les kits d'origine.
import type { SoundPreset } from '../../shared/model'
import type { SoundName } from './synth'

export type SamplePreset = Exclude<SoundPreset, 'glass' | 'wood' | 'air'>
export type Kit = Partial<Record<SoundName, AudioBuffer>>

const FILES = import.meta.glob<string>('./*/*.ogg', { query: '?inline', import: 'default' })

// Les AudioBuffer décodés hors contexte servent à n'importe quel AudioContext.
let decoder: OfflineAudioContext | undefined
const kits = new Map<SamplePreset, Promise<Kit>>()

export function loadKit(preset: SamplePreset): Promise<Kit> {
  let kit = kits.get(preset)
  if (!kit) {
    kit = decodeKit(preset)
    kits.set(preset, kit)
  }
  return kit
}

async function decodeKit(preset: SamplePreset): Promise<Kit> {
  decoder ??= new OfflineAudioContext(1, 1, 48000)
  const context = decoder
  const entries = Object.entries(FILES).filter(([path]) => path.startsWith(`./${preset}/`))
  const decoded = await Promise.all(
    entries.map(async ([path, load]) => {
      const name = path.slice(path.lastIndexOf('/') + 1, -'.ogg'.length) as SoundName
      try {
        const bytes = Uint8Array.from(atob((await load()).split(',')[1] ?? ''), (c) =>
          c.charCodeAt(0)
        )
        return [name, await context.decodeAudioData(bytes.buffer)] as const
      } catch {
        return [name, undefined] as const // fichier illisible : ce son se tait
      }
    })
  )
  return Object.fromEntries(decoded)
}
