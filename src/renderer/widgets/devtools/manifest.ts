// Widget « Outils dev » : Base64, URL, JSON, horodatage, SHA-256 et UUID, sans ouvrir de site.
// Le texte tapé n'est jamais enregistré (il peut contenir un secret) ; seul l'outil choisi l'est.
import CodeIcon from 'phosphor-svelte/lib/CodeIcon'
import type { WidgetManifest } from '../types'
import DevTools from './DevTools.svelte'
import type { Tool } from './tools'

export type DevToolsSettings = { tool: Tool }

const manifest: WidgetManifest<DevToolsSettings> = {
  name: 'Outils dev',
  category: 'dev',
  description: 'Base64, URL, JSON, horodatage, SHA-256 et UUID.',
  icon: CodeIcon,
  size: { w: 4, h: 4, minW: 3, minH: 3 },
  defaults: { tool: 'base64' },
  component: DevTools
}

export default manifest
