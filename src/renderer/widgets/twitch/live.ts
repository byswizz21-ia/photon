// Petits textes du widget Twitch.
const compact = new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 })

// 12345 → « 12 k », 1500 → « 1,5 k ».
export const viewers = (n: number): string => compact.format(n)

// Durée du live : « 45 min », « 2 h 05 ».
export function duration(since: number | null, now: number): string {
  if (since === null) return ''
  const minutes = Math.max(0, Math.floor((now - since) / 60_000))
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`
}
