// Jours entre aujourd'hui et une date « 2026-12-25 », en jours du calendrier local.
// Négatif : date passée ; null : date absente ou invalide.
export function daysUntil(date: string, now: Date): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) return null
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const target = new Date(year, month - 1, day)
  if (target.getMonth() !== month - 1) return null // 31 février…
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  // Arrondi : un passage à l'heure d'été donne une journée de 23 ou 25 h.
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}
