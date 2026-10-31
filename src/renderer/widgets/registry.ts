// Découverte automatique : chaque dossier widgets/<type>/manifest.ts est un widget.
// Le dossier _template/ (modèle à copier) est ignoré. Tout est chargé d'avance : zéro chargement.
import type { WidgetManifest } from './types'

const modules = import.meta.glob<{ default: WidgetManifest }>(
  ['./*/manifest.ts', '!./_template/manifest.ts'],
  { eager: true }
)

export const widgets: Record<string, WidgetManifest> = Object.fromEntries(
  Object.entries(modules).map(([path, module]) => [path.split('/')[1], module.default])
)
