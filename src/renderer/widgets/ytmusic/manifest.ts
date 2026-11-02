// YT Music : lecteur caché piloté depuis Photon (connexion Google une fois, via « Ouvrir YT Music »).
// Options : design « Sobre » ou « Adapté », notification au changement de morceau, accent de
// l'app pris sur la pochette.
import MusicNotesIcon from 'phosphor-svelte/lib/MusicNotesIcon'
import { MUSIC_DEFAULTS, type MusicSettings } from '../../lib/MusicPlayer.svelte'
import type { WidgetManifest } from '../types'
import Music from './Music.svelte'

const manifest: WidgetManifest<MusicSettings> = {
  name: 'YT Music',
  icon: MusicNotesIcon,
  size: { w: 4, h: 2, minW: 2, minH: 2 },
  defaults: MUSIC_DEFAULTS,
  component: Music
}

export default manifest
