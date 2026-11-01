// Batteries des appareils sans fil (widget Batteries), via l'outil natif batteries.cs
// (src/main/native.ts) : lancé au premier usage, ≈ 1 ms par lecture.
import type { Battery } from '../shared/api'
import source from './batteries.cs?raw'
import { nativeTool } from './native'

const tool = nativeTool(source, 'Photon.Batteries')

// null : outil indisponible (lecture suivante = nouvel essai).
export async function batteries(): Promise<Battery[] | null> {
  try {
    const raw = JSON.parse((await tool.send('state')) ?? 'null') as unknown
    if (Array.isArray(raw)) return raw as Battery[]
    if (raw) console.warn('[photon] batteries :', raw)
    return null
  } catch {
    return null
  }
}
