// Widget « Compte à rebours » : jours restants avant une date (échéance, déclaration URSSAF…).
import HourglassIcon from 'phosphor-svelte/lib/HourglassIcon'
import type { WidgetManifest } from '../types'
import Countdown from './Countdown.svelte'

export type CountdownSettings = { title: string; date: string } // date « 2026-12-25 », '' = à choisir

const manifest: WidgetManifest<CountdownSettings> = {
  name: 'Compte à rebours',
  category: 'time',
  description: 'Jours restants avant une date (échéance, vacances…).',
  icon: HourglassIcon,
  size: { w: 3, h: 2, minW: 1, minH: 1 },
  defaults: { title: '', date: '' },
  component: Countdown
}

export default manifest
