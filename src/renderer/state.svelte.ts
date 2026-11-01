// État global de l'interface, partagé par l'app, la grille, le thème et les widgets.
import { prefersReducedMotion } from 'svelte/motion'
import type { AppState } from '../shared/api'
import { defaultProfile, defaultSettings, defaultTheme, type ProfileInfo } from '../shared/model'

export const app = $state({
  visible: false, // fenêtre affichée : les widgets ne lisent le système que dans cet état
  editing: false, // mode édition de la grille
  mini: false, // mini-mode : la barre de commande seule (2e raccourci)
  settings: defaultSettings(),
  theme: defaultTheme(),
  profile: defaultProfile(),
  profiles: [] as ProfileInfo[]
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

let themeTimer: ReturnType<typeof setTimeout> | undefined

// Même principe pour le thème (curseurs des réglages : une écriture par rafale).
export function saveTheme(): void {
  clearTimeout(themeTimer)
  themeTimer = setTimeout(flushTheme, 250)
}

// Écrit tout de suite s'il reste une sauvegarde en attente (appelé à la fermeture de Photon).
export function flushTheme(): void {
  if (themeTimer === undefined) return
  clearTimeout(themeTimer)
  themeTimer = undefined
  void window.photon.saveTheme($state.snapshot(app.theme))
}

// Bascule, création, suppression de profil : les sauvegardes en attente partent d'abord (elles
// visent l'ancien profil), puis l'interface prend tout l'état du nouveau (grille remontée).
export async function changeProfile(request: () => Promise<AppState | null>): Promise<boolean> {
  flushProfile()
  flushTheme()
  const state = await request()
  if (state) Object.assign(app, state)
  return state !== null
}

export function switchProfile(id: string): void {
  if (id !== app.settings.activeProfile) void changeProfile(() => window.photon.switchProfile(id))
}
