// « à l'instant », « 12 min », « 3 h », « hier », « 4 j », puis la date (« 2 nov. »).
export function ago(date: number, now: number): string {
  if (!date) return ''
  const minutes = Math.floor((now - date) / 60_000)
  if (minutes < 1) return 'à l’instant'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'hier'
  if (days < 7) return `${days} j`
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}
