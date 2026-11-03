// Niveau d'un micro : décibels sous le maximum (dBFS) et avis lisible.

export const FLOOR_DB = -60 // en dessous : silence

// Moyenne quadratique d'échantillons -1..1 → dBFS (0 = maximum).
export function decibels(samples: Float32Array): number {
  let sum = 0
  for (const s of samples) sum += s * s
  const rms = Math.sqrt(sum / Math.max(1, samples.length))
  return rms > 0 ? Math.max(FLOOR_DB, 20 * Math.log10(rms)) : FLOOR_DB
}

// Part de la barre (0 à 1) pour un niveau en dB.
export const share = (db: number): number => Math.min(1, Math.max(0, (db - FLOOR_DB) / -FLOOR_DB))

// Avis sur le niveau le plus fort des dernières secondes (voix normale).
export function verdict(peak: number): { text: string; tone: 'ok' | 'low' | 'high' | 'idle' } {
  if (peak <= -50) return { text: 'Parle pour tester', tone: 'idle' }
  if (peak < -30) return { text: 'Trop faible : rapproche-toi ou monte le gain', tone: 'low' }
  if (peak > -3) return { text: 'Ça sature : baisse le gain', tone: 'high' }
  return { text: 'Bon niveau', tone: 'ok' }
}
