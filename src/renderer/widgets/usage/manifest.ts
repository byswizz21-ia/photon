// Widget « Usage Claude » : tokens de Claude Code (fenêtre de 5 h, jour, semaine), lus dans ses
// journaux par Photon (src/main/usage.ts). Designs : classique, « Jauge », « Tableau ».
import GaugeIcon from 'phosphor-svelte/lib/GaugeIcon'
import { cardPx } from '../../lib/DesignPicker.svelte'
import type { WidgetManifest } from '../types'
import Usage from './Usage.svelte'

export type UsageSettings = { design: string; plan: string }

export const USAGE_DESIGNS = [
  ['classic', 'Classique'],
  ['gauge', 'Jauge'],
  ['board', 'Tableau']
] as const

const manifest: WidgetManifest<UsageSettings> = {
  name: 'Usage Claude',
  category: 'dev',
  description: 'Tokens Claude Code utilisés (5 h, jour, semaine).',
  icon: GaugeIcon,
  size: { w: 3, h: 2, minW: 2, minH: 1 },
  defaults: { design: 'classic', plan: 'max5' },
  minSize: ({ design }) =>
    design === 'gauge' ? cardPx(4, 2) : design === 'board' ? cardPx(6, 3) : null,
  component: Usage
}

export default manifest
