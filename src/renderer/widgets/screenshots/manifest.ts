// Widget « Captures » : dernières captures d'écran en miniature, à glisser dans Discord, un mail
// ou l'Explorateur, à copier ou jeter. Dossier de Windows par défaut (Images › Captures d'écran).
import CameraIcon from 'phosphor-svelte/lib/CameraIcon'
import type { WidgetManifest } from '../types'
import Screenshots from './Screenshots.svelte'

export type ScreenshotsSettings = { folder: string } // '' : dossier de Windows

const manifest: WidgetManifest<ScreenshotsSettings> = {
  name: 'Captures récentes',
  category: 'tools',
  description: 'Dernières captures d’écran, à glisser directement dans une autre app.',
  icon: CameraIcon,
  size: { w: 4, h: 3, minW: 2, minH: 2 },
  defaults: { folder: '' },
  component: Screenshots
}

export default manifest
