// Heure d'un fuseau IANA (« America/New_York ») et décalage avec l'heure locale, par Intl.
export interface Zone {
  tz: string
  label: string // nom affiché (« New York »), modifiable
}

export interface ZoneTime {
  time: string // « 14:05 »
  dayShift: number // -1 : hier, 0 : aujourd'hui, 1 : demain (par rapport à l'heure locale)
  diff: number // minutes d'avance sur l'heure locale (négatif : en retard)
  night: boolean // entre 22 h et 7 h là-bas : mieux vaut ne pas appeler
}

const formats = new Map<string, Intl.DateTimeFormat>()

// Un formateur par fuseau, gardé : Intl.DateTimeFormat est lent à créer.
function format(tz: string): Intl.DateTimeFormat {
  let f = formats.get(tz)
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    })
    formats.set(tz, f)
  }
  return f
}

export function isZone(tz: string): boolean {
  try {
    format(tz)
    return true
  } catch {
    return false
  }
}

// Heure murale du fuseau, rangée dans un timestamp « comme si c'était UTC » : la soustraction
// de deux de ces valeurs donne le décalage entre les fuseaux.
function wall(tz: string | undefined, now: Date): number {
  if (!tz) {
    const local = now.getTime() - now.getTimezoneOffset() * 60_000
    return local - (local % 60_000) // à la minute, comme les fuseaux lus par Intl
  }
  const parts = Object.fromEntries(
    format(tz)
      .formatToParts(now)
      .map((p) => [p.type, p.value])
  )
  const n = (key: string): number => Number(parts[key])
  return Date.UTC(n('year'), n('month') - 1, n('day'), n('hour'), n('minute'))
}

export function zoneTime(tz: string, now: Date, localTz?: string): ZoneTime {
  const there = wall(tz, now)
  const here = wall(localTz, now)
  const minuteOfDay = (ms: number): number => Math.floor(ms / 60_000) % 1440
  const day = (ms: number): number => Math.floor(ms / 86_400_000)
  const m = minuteOfDay(there)
  const hour = Math.floor(m / 60)
  return {
    time: `${String(hour).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`,
    dayShift: day(there) - day(here),
    diff: Math.round((there - here) / 60_000),
    night: hour >= 22 || hour < 7
  }
}

// « +6 h », « −4 h 30 », « même heure ».
export function diffLabel(minutes: number): string {
  if (minutes === 0) return 'même heure'
  const abs = Math.abs(minutes)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return `${minutes > 0 ? '+' : '−'}${h} h${m ? ` ${m}` : ''}`
}

// Nom lisible d'un fuseau : « America/Argentina/Buenos_Aires » → « Buenos Aires ».
export const zoneLabel = (tz: string): string => (tz.split('/').pop() ?? tz).replaceAll('_', ' ')

// Fuseaux qui contiennent le texte cherché (nom anglais, sans accents ni casse).
export function searchZones(all: string[], query: string, limit: number): string[] {
  const simple = (s: string): string =>
    s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replaceAll('_', ' ')
  const q = simple(query.trim())
  if (!q) return []
  return all.filter((tz) => simple(tz).includes(q)).slice(0, limit)
}
