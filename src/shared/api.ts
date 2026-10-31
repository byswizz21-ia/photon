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

export interface CpuRam {
  cpu: number // % d'utilisation (0 à 100) depuis la lecture précédente
  ramUsed: number // octets
  ramTotal: number // octets
}

export interface Disk {
  mount: string // « C: »
  total: number // octets
  free: number // octets disponibles
}

// Images de fond servies par le protocole photon:// (src/main/background.ts).
export const WALLPAPER_URL = 'photon://wallpaper'
export const IMAGE_URL = 'photon://image'

export interface PhotonApi {
  // Fenêtre et données
  load(): Promise<AppState>
  ready(): void // interface montée : la fenêtre peut s'afficher
  saveSettings(patch: Partial<Settings>): Promise<Settings>
  saveTheme(theme: Theme): Promise<void>
  saveProfile(profile: Profile): Promise<void>
  hide(reason: string): void // raison écrite dans le log
  shown(): void // première image après affichage (mesure du délai)
  onShow(callback: (event: ShowEvent) => void): () => void
  onHide(callback: () => void): () => void
  onSettings(callback: (settings: Settings) => void): () => void
  // Système, pour les widgets : à lire seulement fenêtre visible (lib/poll.svelte.ts)
  cpuRam(): Promise<CpuRam>
  disks(): Promise<Disk[]>
  // Apps
  fileIcon(path: string): Promise<string | null> // data URL PNG 32 px, null si introuvable
  launch(path: string): Promise<boolean> // ouvre puis cache Photon ; false si Windows échoue
  pickApps(): Promise<string[]> // boîte de dialogue ; [] si annulée
  pathForFile(file: File): string // chemin d'un fichier glissé-déposé ; '' si inconnu
  // Thème
  pickImage(): Promise<string | null> // boîte de dialogue ; null si annulée
}

declare global {
  interface Window {
    photon: PhotonApi
  }
}
