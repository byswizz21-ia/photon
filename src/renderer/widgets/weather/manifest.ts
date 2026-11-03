// Widget « Météo » : Open-Meteo (gratuit, sans clé), lu en fond par Photon (src/main/weather.ts).
// Designs : classique, « Détails progressifs », « Course du soleil ».
import CloudSunIcon from 'phosphor-svelte/lib/CloudSunIcon'
import { cardPx } from '../../lib/DesignPicker.svelte'
import type { WidgetManifest } from '../types'
import Weather from './Weather.svelte'

export type WeatherSettings = { city: string; design: string }

export const WEATHER_DESIGNS = [
  ['classic', 'Classique'],
  ['details', 'Détails'],
  ['sun', 'Soleil']
] as const

const manifest: WidgetManifest<WeatherSettings> = {
  name: 'Météo',
  category: 'info',
  description: 'Température et prévisions de la ville choisie.',
  icon: CloudSunIcon,
  size: { w: 3, h: 2, minW: 2, minH: 1 },
  defaults: { city: '', design: 'classic' },
  minSize: ({ design }) => (design === 'details' || design === 'sun' ? cardPx(3, 2) : null),
  component: Weather
}

export default manifest
