// YT Music : lecteur caché piloté depuis Photon (connexion Google une fois, via « Ouvrir YT Music »).
// Options : notification au changement de morceau, accent de l'app pris sur la pochette.
import MusicNotesIcon from 'phosphor-svelte/lib/MusicNotesIcon'
import type { WidgetManifest } from '../types'
import Music from './Music.svelte'

export type MusicSettings = { notify: boolean; accent: boolean }

const manifest: WidgetManifest<MusicSettings> = {
  name: 'YT Music',
  icon: MusicNotesIcon,
  size: { w: 4, h: 2, minW: 2, minH: 2 },
  defaults: { notify: false, accent: false },
  component: Music
}

export default manifest
