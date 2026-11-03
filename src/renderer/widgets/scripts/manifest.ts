// Widget « Scripts » : boutons qui lancent une commande (npm run dev…) dans un dossier, voyant
// allumé tant qu'elle tourne, fin de sa sortie, bouton stop. Les commandes s'arrêtent avec Photon.
import TerminalWindowIcon from 'phosphor-svelte/lib/TerminalWindowIcon'
import type { WidgetManifest } from '../types'
import Scripts from './Scripts.svelte'

export interface Script {
  id: string
  name: string
  folder: string
  command: string
}

export type ScriptsSettings = { scripts: Script[] }

const manifest: WidgetManifest<ScriptsSettings> = {
  name: 'Scripts',
  category: 'dev',
  description: 'Lance npm run dev (ou autre) d’un clic, voit sa sortie et l’arrête.',
  icon: TerminalWindowIcon,
  size: { w: 4, h: 3, minW: 3, minH: 2 },
  defaults: { scripts: [] },
  component: Scripts
}

export default manifest
