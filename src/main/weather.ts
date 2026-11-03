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

// Heure locale de la ville (« 2026-11-03T07:32 », timezone=auto) → ms.
const localTime = (v: unknown, offset: number): number | null => {
  const ms = typeof v === 'string' ? Date.parse(`${v}Z`) - offset * 1000 : NaN
  return Number.isFinite(ms) ? ms : null
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)

// Réponse Open-Meteo → météo du widget ; valeur absente ou abîmée : null (le widget la cache).
export function parseForecast(
  json: Record<string, unknown>,
  place: string
): Omit<WeatherFeed, 'updatedAt' | 'error'> {
  const offset = num(json['utc_offset_seconds']) ?? 0
  const current = json['current'] as Record<string, unknown> | undefined
  const daily = (json['daily'] ?? {}) as Record<string, unknown>
  const hourly = (json['hourly'] ?? {}) as Record<string, unknown>
  const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
  const at = (v: unknown, i: number): number | null => num(list(v)[i])
  const temperature = num(current?.['temperature_2m'])
  const code = num(current?.['weather_code'])
  return {
    place,
    current:
      temperature !== null && code !== null
        ? {
            temperature,
            code,
            day: current?.['is_day'] !== 0,
            feels: num(current?.['apparent_temperature']),
            humidity: num(current?.['relative_humidity_2m']),
            wind: num(current?.['wind_speed_10m']),
            windFrom: num(current?.['wind_direction_10m']),
            gusts: num(current?.['wind_gusts_10m']),
            dewPoint: num(current?.['dew_point_2m'])
          }
        : null,
    hours: list(hourly['time'])
      .map((time, i) => ({
        time: localTime(time, offset) ?? NaN,
        temperature: at(hourly['temperature_2m'], i) ?? NaN,
        code: at(hourly['weather_code'], i) ?? NaN,
        day: at(hourly['is_day'], i) !== 0,
        rain: at(hourly['precipitation_probability'], i)
      }))
      .filter((hour) => [hour.time, hour.temperature, hour.code].every(Number.isFinite)),
    days: list(daily['time'])
      .map((date, i) => ({
        date: String(date),
        code: at(daily['weather_code'], i) ?? NaN,
        max: at(daily['temperature_2m_max'], i) ?? NaN,
        min: at(daily['temperature_2m_min'], i) ?? NaN,
        sunrise: localTime(list(daily['sunrise'])[i], offset),
        sunset: localTime(list(daily['sunset'])[i], offset),
        uv: at(daily['uv_index_max'], i),
        rain: at(daily['precipitation_probability_max'], i)
      }))
      .filter((day) => [day.code, day.max, day.min].every(Number.isFinite))
  }
}

async function download(city: string): Promise<boolean> {
  const previous = feeds.get(city)
  try {
    const place = await locate(city)
    if (!place) {
      feeds.set(city, {
        place: '',
        current: null,
        hours: [],
        days: [],
        updatedAt: Date.now(),
        error: 'Ville introuvable'
      })
      return true
    }
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}` +
      `&current=temperature_2m,weather_code,is_day,apparent_temperature,relative_humidity_2m,` +
      `wind_speed_10m,wind_direction_10m,wind_gusts_10m,dew_point_2m` +
      `&hourly=temperature_2m,weather_code,is_day,precipitation_probability` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,` +
      `precipitation_probability_max&timezone=auto&forecast_days=${DAYS}`
    feeds.set(city, {
      ...parseForecast(await getJson(url), place.name),
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
      hours: previous?.hours ?? [],
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
  return (
    feeds.get(city) ?? {
      place: '',
      current: null,
      hours: [],
      days: [],
      updatedAt: null,
      error: null
    }
  )
}
