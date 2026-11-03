// Repères du jour pour les designs Journée et Cadran.

// Numéro de semaine ISO 8601 (la semaine du premier jeudi de l'année est la 1).
export function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  return Math.ceil(((d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86_400_000 + 1) / 7)
}

// 1er janvier = 1.
export const dayOfYear = (date: Date): number =>
  Math.round(
    (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) -
      Date.UTC(date.getFullYear(), 0, 1)) /
      86_400_000
  ) + 1
