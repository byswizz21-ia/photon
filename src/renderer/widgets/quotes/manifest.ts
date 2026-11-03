// Widget « Citations » : une citation par jour parmi les thèmes cochés et tes propres citations.
// Tout est dans quotes.ts : aucun réseau.
import QuotesIcon from 'phosphor-svelte/lib/QuotesIcon'
import type { WidgetManifest } from '../types'
import Quotes from './Quotes.svelte'

export type QuotesSettings = { themes: string[]; custom: string }

const manifest: WidgetManifest<QuotesSettings> = {
  name: 'Citations',
  category: 'info',
  description: 'Une citation par jour sur les thèmes qui t’intéressent.',
  icon: QuotesIcon,
  size: { w: 4, h: 2, minW: 2, minH: 2 },
  defaults: { themes: ['motivation', 'business', 'code'], custom: '' },
  component: Quotes
}

export default manifest
