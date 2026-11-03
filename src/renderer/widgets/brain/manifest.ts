// Widget « Cerveau » : devenir plus intelligent en 3 onglets. Mémoire (cartes générées par Claude
// depuis un cours, revues en répétition espacée FSRS, carte des connaissances), Entraînement
// (séance du jour : problème, calibration, biais, Feynman) et Coach (parcours avec pré-test).
// Données partagées entre profils (data/brain.json) ; Claude Code seulement sur clic.
import BrainIcon from 'phosphor-svelte/lib/BrainIcon'
import type { WidgetManifest } from '../types'
import Brain from './Brain.svelte'

export type BrainTab = 'memory' | 'gym' | 'coach'

export type BrainSettings = { tab: BrainTab }

const manifest: WidgetManifest<BrainSettings> = {
  name: 'Cerveau',
  category: 'learn',
  description: 'Cartes de révision par Claude, séance de muscu mentale et coach d’apprentissage.',
  icon: BrainIcon,
  size: { w: 6, h: 6, minW: 4, minH: 5 },
  defaults: { tab: 'memory' },
  component: Brain
}

export default manifest
