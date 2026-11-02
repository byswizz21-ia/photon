// Widget « Météo » : Open-Meteo (gratuit, sans clé), lu en fond par Photon (src/main/weather.ts).
import CloudSunIcon from 'phosphor-svelte/lib/CloudSunIcon'
import type { WidgetManifest } from '../types'
import Weather from './Weather.svelte'

export type WeatherSettings = { city: string }

const manifest: WidgetManifest<WeatherSettings> = {
  name: 'Météo',
  category: 'info',
  description: 'Température et prévisions de la ville choisie.',
  icon: CloudSunIcon,
  size: { w: 3, h: 2, minW: 2, minH: 1 },
  defaults: { city: '' },
  component: Weather
}

export default manifest
