// Widget « Cours » : crypto, actions, indices (Yahoo Finance), lus en fond toutes les 5 min par
// Photon (src/main/markets.ts). Symboles Yahoo séparés par des virgules.
import ChartLineUpIcon from 'phosphor-svelte/lib/ChartLineUpIcon'
import { DEFAULT_MARKET_SYMBOLS } from '../../../shared/api'
import type { WidgetManifest } from '../types'
import Markets from './Markets.svelte'

export type MarketsSettings = { symbols: string }

const manifest: WidgetManifest<MarketsSettings> = {
  name: 'Cours',
  category: 'info',
  description: 'Cours de cryptos, actions et indices.',
  icon: ChartLineUpIcon,
  size: { w: 3, h: 3, minW: 2, minH: 2 },
  defaults: { symbols: DEFAULT_MARKET_SYMBOLS },
  component: Markets
}

export default manifest
