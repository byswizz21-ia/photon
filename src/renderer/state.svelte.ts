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

// Réglage « réduire les animations » de Photon, ou celui de Windows.
export const reducedMotion = (): boolean =>
  app.settings.reduceMotion || prefersReducedMotion.current
