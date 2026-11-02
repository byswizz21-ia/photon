// Widget « Image » : une image pour décorer. Choisie ou glissée, elle est copiée chez Photon
// (%APPDATA%/Photon/images, src/main/background.ts) : l'original peut bouger. Affichage : lib/MediaCard.svelte.
import ImageIcon from 'phosphor-svelte/lib/ImageIcon'
import type { WidgetManifest } from '../types'
import Picture from './Picture.svelte'

export type ImageSettings = { image: string; fit: string } // nom du fichier copié ; 'cover' | 'contain'

const manifest: WidgetManifest<ImageSettings> = {
  name: 'Image',
  category: 'media',
  description: 'Une image pour décorer.',
  icon: ImageIcon,
  size: { w: 3, h: 3, minW: 1, minH: 1 },
  defaults: { image: '', fit: 'cover' },
  component: Picture
}

export default manifest
