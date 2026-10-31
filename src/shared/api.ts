// Contrat du pont : seules ces fonctions passent entre l'interface et Windows (window.photon).
import type { Profile, Settings, Theme } from './model'

export interface AppState {
  settings: Settings
  theme: Theme
  profile: Profile
}

// Position du curseur dans la fenêtre au moment de l'ouverture : origine de la révélation.
export interface ShowEvent {
  origin: { x: number; y: number }
}

export interface PhotonApi {
  load(): Promise<AppState>
  ready(): void // interface montée : la fenêtre peut s'afficher
  saveSettings(patch: Partial<Settings>): Promise<Settings>
  saveProfile(profile: Profile): Promise<void>
  hide(reason: string): void // raison écrite dans le log
  shown(): void // première image après affichage (mesure du délai)
  onShow(callback: (event: ShowEvent) => void): () => void
  onHide(callback: () => void): () => void
  onSettings(callback: (settings: Settings) => void): () => void
}

declare global {
  interface Window {
    photon: PhotonApi
  }
}
