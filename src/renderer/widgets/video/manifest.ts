// Widget « Vidéo » : une vidéo en boucle pour décorer (mp4, webm, mov ; 500 Mo max), copiée chez
// Photon (%APPDATA%/Photon/videos). En pause tant que Photon est caché.
import FilmStripIcon from 'phosphor-svelte/lib/FilmStripIcon'
import type { WidgetManifest } from '../types'
import Video from './Video.svelte'

export type VideoSettings = { file: string; fit: string; sound: boolean }

const manifest: WidgetManifest<VideoSettings> = {
  name: 'Vidéo',
  icon: FilmStripIcon,
  size: { w: 4, h: 3, minW: 1, minH: 1 },
  defaults: { file: '', fit: 'cover', sound: false },
  component: Video
}

export default manifest
