// Calculs du widget Disques, sans Svelte (testés) : tailles affichées, parts, seuil d'exécution.
import type { Disk } from '../../../shared/api'

const GB = 1024 ** 3

// Go entier comme l'Explorateur (1 Go = 1024³ octets) ; à partir de 1000 Go, des To à virgule.
// Sous 1 Go (disque presque plein), des Mo plutôt qu'un « 0 Go » trompeur.
export function format(bytes: number): { value: string; unit: string } {
  if (bytes < GB) return { value: String(Math.floor(bytes / 1024 ** 2)), unit: 'Mo' }
  const go = Math.floor(bytes / GB)
  if (go < 1000) return { value: String(go), unit: 'Go' }
  return { value: (go / 1024).toFixed(1).replace('.', ','), unit: 'To' }
}

// Part libre (0 à 1) : la barre de vie du design « Exécution ».
export const freeShare = (disk: Disk): number =>
  disk.total > 0 ? Math.min(1, Math.max(0, disk.free / disk.total)) : 0

// Part utilisée (0 à 1) : la barre des autres designs se remplit de ce qui est occupé.
export const usedShare = (disk: Disk): number => (disk.total > 0 ? 1 - freeShare(disk) : 0)

// Seuil d'exécution en % (réglage) : 10 à 40, par pas de 5 ; invalide → 25.
export const THRESHOLD = { min: 10, max: 40, step: 5, fallback: 25 } as const

export function threshold(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return THRESHOLD.fallback
  const stepped = Math.round(value / THRESHOLD.step) * THRESHOLD.step
  return Math.min(THRESHOLD.max, Math.max(THRESHOLD.min, stepped))
}

// Sous le seuil d'espace libre : le disque est « Exécutable ».
export const executable = (disk: Disk, limit: number): boolean =>
  disk.total > 0 && freeShare(disk) * 100 < limit
