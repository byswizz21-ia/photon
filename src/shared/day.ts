// Jour local « 2026-11-02 », `offset` jours avant ou après `now` (habitudes, micro-entreprise).
export function dayKey(now: Date, offset = 0): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
