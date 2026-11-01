// Widget « Cours » : crypto, actions, indices (Yahoo Finance), lus en fond toutes les 5 min par
// Photon (src/main/markets.ts). Symboles Yahoo séparés par des virgules.
import ChartLineUpIcon from 'phosphor-svelte/lib/ChartLineUpIcon'
import type { WidgetManifest } from '../types'
import Markets from './Markets.svelte'

export type MarketsSettings = { symbols: string }

const manifest: WidgetManifest<MarketsSettings> = {
  name: 'Cours',
  icon: ChartLineUpIcon,
  size: { w: 3, h: 3, minW: 2, minH: 2 },
  defaults: { symbols: 'BTC-EUR, ETH-EUR' },
  component: Markets
}

export default manifest
