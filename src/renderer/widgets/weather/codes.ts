// Codes météo WMO (Open-Meteo) → libellé et icône Phosphor.
import CloudFogIcon from 'phosphor-svelte/lib/CloudFogIcon'
import CloudIcon from 'phosphor-svelte/lib/CloudIcon'
import CloudLightningIcon from 'phosphor-svelte/lib/CloudLightningIcon'
import CloudMoonIcon from 'phosphor-svelte/lib/CloudMoonIcon'
import CloudRainIcon from 'phosphor-svelte/lib/CloudRainIcon'
import CloudSnowIcon from 'phosphor-svelte/lib/CloudSnowIcon'
import CloudSunIcon from 'phosphor-svelte/lib/CloudSunIcon'
import MoonIcon from 'phosphor-svelte/lib/MoonIcon'
import SunIcon from 'phosphor-svelte/lib/SunIcon'
import type { Component } from 'svelte'

export function describe(code: number, day = true): { label: string; icon: Component } {
  if (code === 0) return { label: 'Ciel dégagé', icon: day ? SunIcon : MoonIcon }
  if (code <= 2) return { label: 'Peu nuageux', icon: day ? CloudSunIcon : CloudMoonIcon }
  if (code === 3) return { label: 'Couvert', icon: CloudIcon }
  if (code <= 48) return { label: 'Brouillard', icon: CloudFogIcon }
  if (code <= 67 || (code >= 80 && code <= 82)) return { label: 'Pluie', icon: CloudRainIcon }
  if (code <= 77 || code === 85 || code === 86) return { label: 'Neige', icon: CloudSnowIcon }
  return { label: 'Orage', icon: CloudLightningIcon }
}
