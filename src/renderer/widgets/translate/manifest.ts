// Widget « Traduction » : texte traduit pendant qu'on tape. Sans clé : MyMemory (≈ 450 caractères
// par demande) ; avec une clé DeepL gratuite (mode édition) : meilleure qualité, textes longs.
import TranslateIcon from 'phosphor-svelte/lib/TranslateIcon'
import type { WidgetManifest } from '../types'
import Translate from './Translate.svelte'

export type TranslateSettings = { to: string; deeplKey: string }

const manifest: WidgetManifest<TranslateSettings> = {
  name: 'Traduction',
  category: 'tools',
  description: 'Traduit un texte pendant que tu tapes, vers la langue choisie.',
  icon: TranslateIcon,
  size: { w: 4, h: 3, minW: 3, minH: 2 },
  defaults: { to: 'en', deeplKey: '' },
  component: Translate
}

export default manifest
