// Widget « Géhenne » (thème Urgot) : les programmes les plus gourmands, à purger d'un bouton ×.
// Même lecture que le widget Processus (src/main/processes.ts, noms protégés jamais fermés).
import FireIcon from 'phosphor-svelte/lib/FireIcon'
import type { WidgetManifest } from '../types'
import Gehenne from './Gehenne.svelte'

export type GehenneSettings = Record<string, never>

const manifest: WidgetManifest<GehenneSettings> = {
  name: 'Géhenne',
  category: 'system',
  description: 'Programmes les plus gourmands en CPU, à purger un par un.',
  icon: FireIcon,
  size: { w: 3, h: 3, minW: 2, minH: 2 },
  defaults: {},
  component: Gehenne
}

export default manifest
