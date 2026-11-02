// Contrat d'un widget : ce qu'il déclare (manifest.ts) et ce qu'il reçoit de Photon (props).
// Accès au système : window.photon (src/shared/api.ts) ; lecture répétée : lib/poll.svelte.ts.
import type { Component } from 'svelte'

export type WidgetSettings = Record<string, unknown>

export interface WidgetProps<S extends WidgetSettings = WidgetSettings> {
  settings: S // réglages de cette instance, complétés par les valeurs par défaut
  editing: boolean // mode édition actif : le widget peut montrer ses réglages
  save(settings: S): void // enregistre les réglages de cette instance dans le profil
}

export interface WidgetManifest<S extends WidgetSettings = WidgetSettings> {
  name: string // nom affiché dans le menu « Ajouter »
  icon: Component // icône Phosphor : import XIcon from 'phosphor-svelte/lib/XIcon'
  size: { w: number; h: number; minW: number; minH: number } // en cases, grille de 12 colonnes
  defaults: S // réglages par défaut d'une nouvelle instance
  // Optionnel : place minimale du contenu en px selon les réglages (un design qui en demande plus),
  // null : celle de `size`. La grille la convertit en cases et agrandit la carte si besoin.
  minSize?(settings: S): { width: number; height: number } | null
  component: Component<WidgetProps<S>>
}
