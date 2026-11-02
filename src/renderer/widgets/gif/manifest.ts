// Widget « GIF » : un GIF animé pour décorer. Fichier ou lien (Giphy, Tenor : la page suffit),
// copié chez Photon (%APPDATA%/Photon/images ou videos : Tenor donne ses GIF en mp4).
import GifIcon from 'phosphor-svelte/lib/GifIcon'
import type { WidgetManifest } from '../types'
import Gif from './Gif.svelte'

export type GifSettings = { file: string; fit: string } // nom de la copie ; 'cover' | 'contain'

const manifest: WidgetManifest<GifSettings> = {
  name: 'GIF',
  category: 'media',
  description: 'Un GIF animé pour décorer (fichier, Giphy, Tenor).',
  icon: GifIcon,
  size: { w: 3, h: 3, minW: 1, minH: 1 },
  defaults: { file: '', fit: 'cover' },
  component: Gif
}

export default manifest
