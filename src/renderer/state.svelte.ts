// État global de l'interface, partagé par l'app, la grille, le thème et les widgets.
import { prefersReducedMotion } from 'svelte/motion'
import { defaultProfile, defaultSettings, defaultTheme } from '../shared/model'

export const app = $state({
  visible: false, // fenêtre affichée : les widgets ne lisent le système que dans cet état
  editing: false, // mode édition de la grille
  settings: defaultSettings(),
  theme: defaultTheme(),
  profile: defaultProfile()
})

let saveTimer: ReturnType<typeof setTimeout> | undefined

// Sauvegarde le profil peu après le dernier changement : une écriture par rafale.
export function saveProfile(): void {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(flushProfile, 250)
}

// Écrit tout de suite s'il reste une sauvegarde en attente (appelé à la fermeture de Photon).
export function flushProfile(): void {
  if (saveTimer === undefined) return
  clearTimeout(saveTimer)
  saveTimer = undefined
  void window.photon.saveProfile($state.snapshot(app.profile))
}

// Réglage « réduire les animations » de Photon, ou celui de Windows.
export const reducedMotion = (): boolean =>
  app.settings.reduceMotion || prefersReducedMotion.current
