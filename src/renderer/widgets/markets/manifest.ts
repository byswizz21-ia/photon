// Widget « Cours » : crypto, actions, indices (Yahoo Finance), lus en fond toutes les 5 min par
// Photon (src/main/markets.ts). Symboles Yahoo séparés par des virgules.
// Designs : classique, « Vedette » (un actif en grand), « Marché » (liste + graphique détaillé).
import ChartLineUpIcon from 'phosphor-svelte/lib/ChartLineUpIcon'
import { DEFAULT_MARKET_SYMBOLS } from '../../../shared/api'
import { cardPx } from '../../lib/DesignPicker.svelte'
import type { WidgetManifest } from '../types'
import Markets from './Markets.svelte'

export type MarketsSettings = { symbols: string; design: string }

export const MARKETS_DESIGNS = [
  ['classic', 'Classique'],
  ['spot', 'Vedette'],
  ['market', 'Marché']
] as const

// Taille des maquettes : Vedette 3 × 3, Marché 6 × 3.
const MIN = { spot: cardPx(3, 3), market: cardPx(6, 3) } as Record<
  string,
  ReturnType<typeof cardPx>
>

const manifest: WidgetManifest<MarketsSettings> = {
  name: 'Cours',
  category: 'info',
  description: 'Cours de cryptos, actions et indices.',
  icon: ChartLineUpIcon,
  size: { w: 3, h: 3, minW: 2, minH: 2 },
  defaults: { symbols: DEFAULT_MARKET_SYMBOLS, design: 'classic' },
  minSize: ({ design }) => MIN[design] ?? null,
  component: Markets
}

export default manifest
