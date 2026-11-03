// Widget « Sorties » : prochains films au cinéma, nouvelles séries (TMDB, clé gratuite) ou jeux
// attendus sur Steam (sans clé). Lu en fond par Photon (src/main/releases.ts).
import PopcornIcon from 'phosphor-svelte/lib/PopcornIcon'
import type { ReleaseKind } from '../../../shared/api'
import type { WidgetManifest } from '../types'
import Releases from './Releases.svelte'

export type ReleasesSettings = { kind: ReleaseKind; tmdbKey: string }

const manifest: WidgetManifest<ReleasesSettings> = {
  name: 'Sorties',
  category: 'info',
  description: 'Films, séries et jeux qui sortent bientôt.',
  icon: PopcornIcon,
  size: { w: 4, h: 3, minW: 3, minH: 2 },
  defaults: { kind: 'game', tmdbKey: '' },
  component: Releases
}

export default manifest
