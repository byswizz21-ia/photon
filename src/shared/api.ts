// Contrat du pont : seules ces fonctions passent entre l'interface et Windows (window.photon).
import type { Profile, Settings, Theme } from './model'

export interface AppState {
  settings: Settings
  theme: Theme
  profile: Profile
}

// Position du curseur dans la fenêtre au moment de l'ouverture : origine de la révélation.
// mini : seulement la barre de commande, petite et centrée (2e raccourci).
export interface ShowEvent {
  origin: { x: number; y: number }
  mini: boolean
}

// Barre de commande (src/main/search/) : l'interface ne manipule que des identifiants.
export interface SearchResult {
  id: string // « ui:… » = action de l'interface, « claude » = question pour Claude
  kind: 'app' | 'file' | 'folder' | 'site' | 'web' | 'calc' | 'command' | 'action' | 'claude'
  title: string
  subtitle: string
  confirm: boolean // commande lourde (redémarrer…) : Entrée deux fois
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

// Agenda : événements à venir d'une adresse iCal, lus en fond par Photon (src/main/calendar.ts).
export interface CalendarEvent {
  title: string
  start: number // ms depuis 1970
  end: number // ms, exclue (un événement « journée » finit à minuit le lendemain)
  allDay: boolean
  location: string
}

export interface CalendarFeed {
  events: CalendarEvent[] // pas encore finis, sur 14 jours, triés
  updatedAt: number | null // dernière lecture réussie ; null = jamais
  error: string | null // échec de la dernière lecture (les événements précédents restent)
}

// Barre Claude : Claude Code lancé côté Windows (src/main/claude.ts), conversation gardée par Photon.
export interface ClaudeMessage {
  role: 'user' | 'assistant'
  text: string // Markdown pour Claude ; se remplit mot par mot pendant la réponse
  files?: string[] // fichiers joints (chemins Windows)
  status?: string // activité en cours (« Lecture de notes.txt… ») ; absent une fois fini
  error?: string // réponse en échec ou interrompue
}

export interface Conversation {
  id: string // UUID, aussi identifiant de session Claude Code (--session-id puis --resume)
  title: string // début de la première question
  updatedAt: number
  started: boolean // Claude Code a créé la session : les questions suivantes la reprennent
  messages: ClaudeMessage[]
}

// Question : lecture seule ; Agent : agit sur le PC après accord ; Bypass : agit sans demander.
export type ClaudeMode = 'question' | 'agent' | 'bypass'

// Action que Claude veut faire en mode Agent, à accepter ou refuser.
export interface ClaudeApproval {
  id: string
  title: string // « Exécuter une commande »
  detail: string // la commande entière, le fichier et son contenu…
}

export interface ClaudeState {
  available: boolean // claude.exe trouvé côté Windows
  busy: boolean // une réponse est en cours
  mode: ClaudeMode // revient à Question quand Photon se cache (Bypass) ou redémarre
  approval: ClaudeApproval | null // action en attente d'accord
  current: Conversation
  history: { id: string; title: string; updatedAt: number }[] // plus récentes d'abord
}

// YT Music : lecteur caché piloté par Photon (src/main/music.ts).
export type MusicCommand = 'toggle' | 'next' | 'previous'

export interface MusicTrack {
  title: string
  artist: string
  artwork: string // data URL ; '' tant que la pochette n'est pas téléchargée
  playing: boolean
  time: number // secondes
  duration: number // secondes
  volume: number // 0 à 100
}

export interface MusicState {
  ready: boolean // page YT Music chargée (false aussi sans widget YT Music)
  signedIn: boolean
  track: MusicTrack | null // null : rien en cours
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
  // Agenda : cache seulement, aucun appel réseau ; null si l'adresse n'est pas en https/webcal
  calendar(url: string): Promise<CalendarFeed | null>
  // Barre Claude : l'état complet arrive par onClaude à chaque changement
  claudeState(): Promise<ClaudeState>
  onClaude(callback: (state: ClaudeState) => void): () => void
  claudeAsk(text: string, files: string[]): Promise<boolean> // false si occupé ou indisponible
  claudeStop(): void
  claudeNew(): void
  claudeOpen(id: string): void
  claudeMode(mode: ClaudeMode): void
  claudeApprove(id: string, allow: boolean): void
  claudeImage(png: Uint8Array): Promise<string | null> // capture collée → fichier temporaire
  clipboardText(): Promise<string>
  copyText(text: string): void
  // YT Music : état lu dans la page cachée, sans appel réseau
  music(): Promise<MusicState>
  musicControl(command: MusicCommand): Promise<void>
  musicSeek(seconds: number): Promise<void>
  musicVolume(volume: number): Promise<void> // 0 à 100
  musicOpen(): void // interface complète de YT Music (navigation, connexion Google)
  // Barre de commande
  search(query: string): Promise<SearchResult[]>
  openResult(id: string, inFolder: boolean): Promise<boolean> // true : ouvert, Photon se cache
  resultIcon(id: string): Promise<string | null>
  barResize(height: number): void // mini-mode : la fenêtre suit la hauteur de la barre
  // Thème
  pickImage(): Promise<string | null> // boîte de dialogue ; null si annulée
}

declare global {
  interface Window {
    photon: PhotonApi
  }
}
