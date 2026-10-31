// Modèle de widget. Pour en créer un : copier ce dossier vers widgets/<nom>/ (le nom du dossier
// devient le type du widget), puis adapter ce manifest et le composant. Rien d'autre à toucher.
import CubeIcon from 'phosphor-svelte/lib/CubeIcon'
import type { WidgetManifest } from '../types'
import Template from './Template.svelte'

export type TemplateSettings = { label: string }

const manifest: WidgetManifest<TemplateSettings> = {
  name: 'Modèle',
  icon: CubeIcon,
  size: { w: 3, h: 2, minW: 2, minH: 1 },
  defaults: { label: 'Bonjour' },
  component: Template
}

export default manifest
