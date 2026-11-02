// Météo des widgets Météo (Open-Meteo, gratuit, sans clé) : lue en fond (démarrage, puis toutes
// les 30 min), jamais à l'ouverture de Photon. L'interface ne lit que le cache en mémoire.
// Ville → coordonnées (géocodage) une seule fois par ville.
import { net } from 'electron'
import type { WeatherFeed } from '../shared/api'
import { data } from './data'

const REFRESH_MS = 30 * 60_000
const RETRY_MS = 3 * 60_000
const TIMEOUT_MS = 10_000
const DAYS = 5

const feeds = new Map<string, WeatherFeed>()
const places = new Map<string, { name: string; latitude: number; longitude: number }>()
const pending = new Map<string, Promise<boolean>>()
let timer: NodeJS.Timeout | undefined

const cityKey = (raw: unknown): string | null => {
  if (typeof raw !== 'string') return null
  const city = raw.trim().replace(/\s+/g, ' ').slice(0, 80)
  return city || null
}

function watchedCities(): string[] {
  const cities = data.profile.widgets
    .filter((widget) => widget.type === 'weather')
    .map((widget) => cityKey(widget.settings['city']))
  return [...new Set(cities.filter((city) => city !== null))]
}

async function getJson(url: string): Promise<Record<string, unknown>> {
  const response = await net.fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!response.ok) throw new Error(`réponse ${response.status}`)
  return (await response.json()) as Record<string, unknown>
}

const numbers = (v: unknown): number[] =>
  Array.isArray(v) ? v.map((n) => (typeof n === 'number' ? n : NaN)) : []

async function locate(
  city: string
): Promise<{ name: string; latitude: number; longitude: number } | null> {
  const known = places.get(city)
  if (known) return known
  const url = `https://geocoding-api.open-meteo.com/v1/search?count=1&language=fr&name=${encodeURIComponent(city)}`
  const first = ((await getJson(url))['results'] as Record<string, unknown>[] | undefined)?.[0]
  const place =
    first && typeof first['latitude'] === 'number' && typeof first['longitude'] === 'number'
      ? {
          name: typeof first['name'] === 'string' ? first['name'] : city,
          latitude: first['latitude'],
          longitude: first['longitude']
        }
      : null
  if (place) places.set(city, place) // introuvable : réessayé au prochain rafraîchissement
  return place
}

async function download(city: string): Promise<boolean> {
  const previous = feeds.get(city)
  try {
    const place = await locate(city)
    if (!place) {
      feeds.set(city, {
        place: '',
        current: null,
        days: [],
        updatedAt: Date.now(),
        error: 'Ville introuvable'
      })
      return true
    }
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}` +
      `&current=temperature_2m,weather_code,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min` +
      `&timezone=auto&forecast_days=${DAYS}`
    const json = await getJson(url)
    const current = json['current'] as Record<string, unknown> | undefined
    const daily = (json['daily'] ?? {}) as Record<string, unknown>
    const dates = Array.isArray(daily['time']) ? (daily['time'] as unknown[]) : []
    const codes = numbers(daily['weather_code'])
    const max = numbers(daily['temperature_2m_max'])
    const min = numbers(daily['temperature_2m_min'])
    feeds.set(city, {
      place: place.name,
      current:
        typeof current?.['temperature_2m'] === 'number' &&
        typeof current['weather_code'] === 'number'
          ? {
              temperature: current['temperature_2m'],
              code: current['weather_code'],
              day: current['is_day'] !== 0
            }
          : null,
      days: dates
        .map((date, i) => ({
          date: String(date),
          code: codes[i] ?? NaN,
          max: max[i] ?? NaN,
          min: min[i] ?? NaN
        }))
        .filter((day) => [day.code, day.max, day.min].every(Number.isFinite)),
      updatedAt: Date.now(),
      error: null
    })
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`[photon] météo illisible (${city}) : ${message}`)
    // Dernière météo connue gardée : mieux vaut une météo d'1 h qu'un widget vide.
    feeds.set(city, {
      place: previous?.place ?? '',
      current: previous?.current ?? null,
      days: previous?.days ?? [],
      updatedAt: previous?.updatedAt ?? null,
      error: 'Hors ligne'
    })
    return false
  }
}

function refresh(city: string): Promise<boolean> {
  let read = pending.get(city)
  if (!read) {
    read = download(city).finally(() => pending.delete(city))
    pending.set(city, read)
  }
  return read
}

async function refreshAll(): Promise<void> {
  clearTimeout(timer)
  const cities = watchedCities()
  for (const city of feeds.keys()) if (!cities.includes(city)) feeds.delete(city)
  const results = await Promise.all(cities.map(refresh))
  timer = setTimeout(() => void refreshAll(), results.every(Boolean) ? REFRESH_MS : RETRY_MS)
}

export function startWeather(): void {
  void refreshAll()
}

// Profil enregistré ou changé : une ville nouvelle est lue tout de suite (geste de l'utilisateur).
export function onWeatherProfile(): void {
  for (const city of watchedCities()) if (!feeds.has(city)) void refresh(city)
}

// Cache seulement. null : pas de ville. updatedAt null sans erreur : première lecture en cours.
export function weather(raw: unknown): WeatherFeed | null {
  const city = cityKey(raw)
  if (!city) return null
  return feeds.get(city) ?? { place: '', current: null, days: [], updatedAt: null, error: null }
}
