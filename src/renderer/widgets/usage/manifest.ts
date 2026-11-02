// Widget « Usage Claude » : tokens de Claude Code (fenêtre de 5 h, jour, semaine), lus dans ses
// journaux par Photon (src/main/usage.ts).
import GaugeIcon from 'phosphor-svelte/lib/GaugeIcon'
import type { WidgetManifest } from '../types'
import Usage from './Usage.svelte'

export type UsageSettings = Record<string, never>

const manifest: WidgetManifest<UsageSettings> = {
  name: 'Usage Claude',
  category: 'dev',
  description: 'Tokens Claude Code utilisés (5 h, jour, semaine).',
  icon: GaugeIcon,
  size: { w: 3, h: 2, minW: 2, minH: 1 },
  defaults: {},
  component: Usage
}

export default manifest
