// Widget « Actualités » : articles des sujets choisis (Google Actualités ou flux RSS d'un site),
// lus en fond toutes les 30 min par Photon (src/main/news.ts).
import NewspaperIcon from 'phosphor-svelte/lib/NewspaperIcon'
import { DEFAULT_NEWS_TOPICS } from '../../../shared/api'
import type { WidgetManifest } from '../types'
import News from './News.svelte'

export type NewsSettings = { topics: string }

const manifest: WidgetManifest<NewsSettings> = {
  name: 'Actualités',
  category: 'info',
  description: 'Les derniers articles sur les sujets qui t’intéressent.',
  icon: NewspaperIcon,
  size: { w: 4, h: 4, minW: 2, minH: 2 },
  defaults: { topics: DEFAULT_NEWS_TOPICS },
  component: News
}

export default manifest
