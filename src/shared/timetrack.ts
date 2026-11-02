// Données et calculs du suivi du temps (data/timetrack.json, partagé entre profils).
export interface Project {
  id: string
  name: string
}

export interface Entry {
  project: string // id du projet
  start: number // ms
  end: number // ms
}

export interface TimeData {
  projects: Project[]
  running: { project: string; start: number } | null
  entries: Entry[]
}

const MAX_PROJECTS = 30
const MAX_ENTRIES = 5_000
const KEEP_MS = 400 * 86_400_000 // un peu plus d'un an d'historique

const isText = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 200
const isTime = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0

export function parseTime(raw: unknown): TimeData {
  const v = (raw ?? {}) as Record<string, unknown>
  const projects = (Array.isArray(v['projects']) ? v['projects'] : [])
    .filter((p): p is Project => isText(p?.id) && isText(p.name))
    .slice(0, MAX_PROJECTS)
    .map(({ id, name }) => ({ id, name }))
  const known = (id: unknown): boolean => projects.some((p) => p.id === id)
  const entries = (Array.isArray(v['entries']) ? v['entries'] : [])
    .filter(
      (e): e is Entry => known(e?.project) && isTime(e.start) && isTime(e.end) && e.end > e.start
    )
    .slice(-MAX_ENTRIES)
    .map(({ project, start, end }) => ({ project, start, end }))
  const r = v['running'] as Record<string, unknown> | null | undefined
  const running =
    r && known(r['project']) && isTime(r['start'])
      ? { project: r['project'] as string, start: r['start'] }
      : null
  return { projects, running, entries }
}

// Temps passé sur un projet entre `from` et `now`, chrono en cours compris.
export function spent(data: TimeData, project: string, from: number, now: number): number {
  const all =
    data.running?.project === project
      ? [...data.entries, { ...data.running, end: now }]
      : data.entries
  return all
    .filter((e) => e.project === project)
    .reduce((sum, e) => sum + Math.max(0, Math.min(e.end, now) - Math.max(e.start, from)), 0)
}

// Démarre le projet ; s'il tournait déjà, l'arrête. Un autre projet en cours est arrêté avant.
export function toggle(data: TimeData, project: string, now: number): void {
  const previous = data.running
  if (previous) {
    if (now > previous.start) data.entries.push({ ...previous, end: now })
    data.entries = data.entries.filter((e) => e.end > now - KEEP_MS).slice(-MAX_ENTRIES)
  }
  data.running = previous?.project === project ? null : { project, start: now }
}

export function startOfDay(now: number): number {
  return new Date(now).setHours(0, 0, 0, 0)
}

// Semaine à la française : depuis lundi 0 h.
export function startOfWeek(now: number): number {
  const day = new Date(startOfDay(now))
  day.setDate(day.getDate() - ((day.getDay() + 6) % 7))
  return day.getTime()
}

// 3 h 05, 12 min
export function duration(ms: number): string {
  const minutes = Math.floor(ms / 60_000)
  return minutes >= 60
    ? `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`
    : `${minutes} min`
}
