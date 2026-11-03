// Calculs des designs « Détails progressifs » et « Course du soleil » : heures à venir, courbe
// des températures, arc du soleil, vent, UV.
import type { WeatherHour } from '../../../shared/api'

const HOUR = 3_600_000

// Les n heures à partir de l'heure en cours.
export const upcoming = (hours: WeatherHour[], now: number, n: number): WeatherHour[] =>
  hours.filter((h) => h.time + HOUR > now).slice(0, n)

// Première heure de pluie probable (≥ 50 %) d'ici minuit, null si aucune.
export function rainFrom(hours: WeatherHour[], now: number): number | null {
  const midnight = new Date(now).setHours(24, 0, 0, 0)
  return (
    upcoming(hours, now, 24).find((h) => h.time < midnight && (h.rain ?? 0) >= 50)?.time ?? null
  )
}

const WINDS = ['Nord', 'Nord-est', 'Est', 'Sud-est', 'Sud', 'Sud-ouest', 'Ouest', 'Nord-ouest']
const SHORT = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO']
// Direction d'où vient le vent (degrés) → « Sud-ouest » ou « SO ».
export function windName(degrees: number, short = false): string {
  const i = Math.round((((degrees % 360) + 360) % 360) / 45) % 8
  return (short ? SHORT : WINDS)[i]!
}

export function uvLabel(uv: number): string {
  if (uv < 3) return 'faible'
  if (uv < 6) return 'modéré'
  if (uv < 8) return 'élevé'
  if (uv < 11) return 'très élevé'
  return 'extrême'
}

// Courbe lissée (Catmull-Rom) des températures sur w × h px, un point au centre de chaque colonne.
export function curve(temps: number[], w: number, h: number) {
  const lo = Math.min(...temps) - 1
  const hi = Math.max(...temps) + 1
  const n = temps.length
  const pts = temps.map((t, i): [number, number] => [
    ((i + 0.5) * w) / n,
    6 + (h - 14) * (1 - (t - lo) / (hi - lo))
  ])
  const p = (i: number): [number, number] => pts[Math.min(n - 1, Math.max(0, i))]!
  const f = (v: number): string => v.toFixed(1)
  let line = `M${f(p(0)[0])},${f(p(0)[1])}`
  for (let i = 0; i < n - 1; i++) {
    const [p0, p1, p2, p3] = [p(i - 1), p(i), p(i + 1), p(i + 2)]
    line +=
      ` C${f(p1[0] + (p2[0] - p0[0]) / 6)},${f(p1[1] + (p2[1] - p0[1]) / 6)}` +
      ` ${f(p2[0] - (p3[0] - p1[0]) / 6)},${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])},${f(p2[1])}`
  }
  const area = n ? `${line} L${f(p(n - 1)[0])},${h} L${f(p(0)[0])},${h} Z` : ''
  return { line, area, points: pts }
}

// Arc du soleil sur w × h px, du lever (gauche) au coucher (droite) ; position actuelle.
export function sunArc(w: number, h: number, rise: number, set: number, now: number) {
  const base = h - 4
  const x0 = 6
  const x1 = w - 6
  const rx = (x1 - x0) / 2
  const ry = h - 12
  const t = (now - rise) / (set - rise)
  const day = t > 0 && t < 1
  const tc = Math.min(1, Math.max(0, t))
  const x = w / 2 - rx * Math.cos(Math.PI * tc)
  const y = base - ry * Math.sin(Math.PI * tc)
  const arc = (ex: number, ey: number): string =>
    `M${x0},${base} A${rx},${ry} 0 0 1 ${ex.toFixed(1)},${ey.toFixed(1)}`
  return {
    full: arc(x1, base),
    done: day ? arc(x, y) : t >= 1 ? arc(x1, base) : `M${x0},${base}`,
    x,
    y,
    base,
    day,
    toSet: Math.max(0, Math.round((set - now) / 60_000)) // minutes
  }
}
