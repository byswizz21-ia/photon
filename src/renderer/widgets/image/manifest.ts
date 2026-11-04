// Widget « Image » : une image pour décorer. Choisie ou glissée, elle est copiée chez Photon
// (%APPDATA%/Photon/images, src/main/background.ts) : l'original peut bouger. Affichage : lib/MediaCard.svelte.
import ImageIcon from 'phosphor-svelte/lib/ImageIcon'
import type { WidgetManifest } from '../types'
import Picture from './Picture.svelte'

// image : nom du fichier copié ; fit : 'cover' | 'contain'. Titre posé en bas (splash du thème
// Urgot) : kicker au-dessus en accent, title en grand, subtitle dessous ; tout vide = aucun titre.
export type ImageSettings = {
  image: string
  fit: string
  kicker: string
  title: string
  subtitle: string
}

const manifest: WidgetManifest<ImageSettings> = {
  name: 'Image',
  category: 'media',
  description: 'Une image pour décorer.',
  icon: ImageIcon,
  size: { w: 3, h: 3, minW: 1, minH: 1 },
  defaults: { image: '', fit: 'cover', kicker: '', title: '', subtitle: '' },
  component: Picture
}

export default manifest
