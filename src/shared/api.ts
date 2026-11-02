// Contrat du pont : seules ces fonctions passent entre l'interface et Windows (window.photon).
import type { Profile, ProfileInfo, Settings, Theme } from './model'

export interface AppState {
  settings: Settings
  theme: Theme
  profile: Profile // profil actif
  profiles: ProfileInfo[] // tous, du plus ancien au plus récent
}

// Création d'un profil : 'blank' (vierge), 'duplicate' (copie du profil actif) ou id d'un modèle
// (shared/templates.ts).
export type ProfileSource = string

// Position du curseur dans la fenêtre au moment de l'ouverture : origine de la révélation.
// mini : seulement la barre de commande, petite et centrée (2e raccourci).
// Écran sous la fenêtre, en coordonnées de la fenêtre : où poser sa capture pour qu'elle tombe
// juste derrière Photon (src/main/backdrop.ts).
export interface Placement {
  id: number
  x: number
  y: number
  width: number
  height: number
  moving: boolean // fenêtre glissée : capture masquée
}

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

// Températures en °C, null si inconnue. CPU : seulement si LibreHardwareMonitor tourne (lhm).
export interface Temperatures {
  cpu: number | null
  gpu: number | null
  gpuLoad: number | null // % (nvidia-smi)
  lhm: boolean // serveur web de LibreHardwareMonitor joignable
}

// Écran proposé dans les réglages (id Electron en texte).
export interface DisplayInfo {
  id: string
  label: string // « DELL U2719D (2560×1440), principal »
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

// Lecteurs de musique (src/main/music.ts) : YT Music, Deezer et SoundCloud dans une page cachée,
// Spotify par son app Windows. Le type du widget est le nom du service.
export const MUSIC_SERVICES = {
  ytmusic: 'YT Music',
  deezer: 'Deezer',
  soundcloud: 'SoundCloud',
  spotify: 'Spotify'
} as const
export type MusicService = keyof typeof MUSIC_SERVICES
export type MusicCommand =
  'toggle' | 'next' | 'previous' | 'like' | 'dislike' | 'shuffle' | 'repeat' // désactivée → toute la file → un titre → désactivée

export interface MusicTrack {
  title: string
  artist: string
  artwork: string // data URL ; '' tant que la pochette n'est pas téléchargée
  playing: boolean
  time: number // secondes
  duration: number // secondes
  canSeek: boolean // le service accepte qu'on change la position
  volume: number // 0 à 100 ; -1 : inconnu (curseur caché)
  // null : le service ne l'offre pas, ou bouton introuvable dans la page (bouton caché)
  like: 'like' | 'dislike' | 'none' | null // dislike : YT Music seulement
  shuffle: boolean | null
  repeat: 'none' | 'all' | 'one' | null
}

// File d'attente (YT Music seulement), à partir du morceau en cours.
export interface MusicQueueItem {
  id: string // identifiant de la vidéo YouTube
  title: string
  artist: string
  duration: string // « 3:18 »
  current: boolean
  artwork: string // data URL ; '' tant que la miniature n'est pas téléchargée
}

export interface MusicState {
  ready: boolean // page du service chargée (false aussi sans widget de ce service)
  signedIn: boolean // Spotify : app ouverte
  track: MusicTrack | null // null : rien en cours
}

// Pomodoro (src/main/pomodoro.ts) : un seul, partagé par tous les profils.
export type PomodoroCommand = 'start' | 'pause' | 'skip' | 'reset'

export interface PomodoroState {
  phase: 'idle' | 'focus' | 'pause'
  running: boolean
  endsAt: number // ms depuis 1970, phase en cours
  left: number // ms restantes, phase en pause
  total: number // ms, durée de la phase
}

// Météo (src/main/weather.ts) : cache lu en fond, codes météo WMO.
export interface WeatherDay {
  date: string // « 2026-11-01 »
  code: number
  max: number // °C
  min: number // °C
}

export interface WeatherFeed {
  place: string // nom trouvé par le géocodage
  current: { temperature: number; code: number; day: boolean } | null
  days: WeatherDay[] // aujourd'hui d'abord
  updatedAt: number | null // dernière lecture réussie ; null = jamais
  error: string | null
}

export interface NetworkRate {
  down: number // octets/s reçus
  up: number // octets/s envoyés
}

export interface AudioDevice {
  id: string
  name: string // « Casque (Realtek Audio) »
}

export interface AudioState {
  volume: number // 0 à 100, sortie par défaut
  muted: boolean
  current: string // identifiant de la sortie par défaut
  devices: AudioDevice[] // sorties actives
}

// Usage de Claude Code, lu dans ses journaux (src/main/usage.ts). Tokens = entrée + sortie +
// écriture en cache.
export interface ClaudeUsage {
  session: number // fenêtre de 5 h en cours ; 0 si aucune
  messages: number // réponses dans cette fenêtre
  resetsAt: number | null // fin de la fenêtre en cours (ms) ; null si aucune
  today: number
  week: number // 7 derniers jours
  sources: number // dossiers de journaux trouvés (0 : Claude Code jamais lancé)
}

// Batterie d'un appareil sans fil connu (src/main/batteries.cs).
export interface Battery {
  name: string
  level: number | null // % ; null : éteint ou hors de portée
  charging: boolean
}

// Cours (src/main/markets.ts) : cache lu en fond.
export interface MarketQuote {
  symbol: string // BTC-EUR, AAPL…
  name: string
  price: number
  previous: number // clôture de la veille (crypto : il y a 24 h)
  currency: string
  points: number[] // cours de la journée, du plus ancien au plus récent
}

// Symboles d'un widget Cours jamais réglé : partagés par le widget et le téléchargement en fond.
export const DEFAULT_MARKET_SYMBOLS = 'BTC-EUR, ETH-EUR'

export interface MarketFeed {
  quotes: MarketQuote[] // dans l'ordre du widget, seulement ceux déjà lus
  missing: string[] // symboles introuvables ou illisibles
  updatedAt: number | null // dernière lecture réussie ; null = jamais
}

// Processus regroupés par nom (src/main/processes.ts).
export interface ProcessGroup {
  name: string // nom du processus (« chrome »), sert aussi d'identifiant
  label: string // nom lisible de l'exécutable (« Google Chrome »), sinon le nom
  count: number // processus de ce nom
  cpu: number // % de tout le processeur
  memory: number // octets
  closable: boolean // false : Windows ou Photon
}

// Dépôt du widget Projets Git (src/main/git.ts).
export interface GitRepo {
  path: string
  name: string // nom du dossier
  branch: string
  upstream: boolean // branche suivie sur un dépôt distant
  ahead: number // commits pas encore poussés
  behind: number // commits du distant pas encore récupérés (au dernier fetch)
  changed: number // fichiers modifiés, renommés ou en conflit
  untracked: number // nouveaux fichiers
  commit: { subject: string; at: number } | null // dernier commit ; null : dépôt vide
  error: string | null // « Pas un dépôt Git », « Dossier introuvable »…
}

// Anti-veille (src/main/awake.ts) : un seul, partagé par tous les profils.
export interface AwakeState {
  on: boolean
  screen: boolean // l'écran reste allumé aussi
  until: number | null // ms depuis 1970 ; null : jusqu'à l'arrêt
}

// Pause des yeux (src/main/eyes.ts) : rappel régulier, réglé par le widget.
export interface EyesState {
  on: boolean
  minutes: number // entre deux rappels
  next: number | null // ms depuis 1970 du prochain rappel ; null : coupé
}

export interface RecentFile {
  path: string
  name: string
  folder: boolean
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
  // Profils : null si refusé ; sinon tout l'état du profil devenu actif. Avant d'appeler,
  // l'interface envoie ses sauvegardes en attente (elles visent encore l'ancien profil).
  switchProfile(id: string): Promise<AppState | null>
  createProfile(source: ProfileSource): Promise<AppState | null>
  deleteProfile(): Promise<AppState | null> // le profil actif, jamais le dernier
  hide(reason: string): void // raison écrite dans le log
  shown(): void // première image après affichage (mesure du délai)
  onShow(callback: (event: ShowEvent) => void): () => void
  onHide(callback: () => void): () => void
  onSettings(callback: (settings: Settings) => void): () => void
  onSwitchTo(callback: (profileId: string) => void): () => void // bascule auto (src/main/auto.ts)
  onPlace(callback: (place: Placement) => void): () => void // écran sous la fenêtre (flou réglable)
  // Système, pour les widgets : à lire seulement fenêtre visible (lib/poll.svelte.ts)
  cpuRam(): Promise<CpuRam>
  temperatures(): Promise<Temperatures>
  displays(): Promise<DisplayInfo[]>
  disks(): Promise<Disk[]>
  // Apps
  fileIcon(path: string): Promise<string | null> // data URL PNG 32 px, null si introuvable
  launch(path: string): Promise<boolean> // ouvre puis cache Photon ; false si Windows échoue
  pickApps(): Promise<string[]> // boîte de dialogue ; [] si annulée
  pickAutoApps(): Promise<string[]> // idem, noms d'exécutables (règles de bascule auto)
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
  // Musique : état lu dans la page cachée ou auprès de Windows, sans appel réseau
  music(service: MusicService): Promise<MusicState>
  musicControl(service: MusicService, command: MusicCommand): Promise<void>
  musicSeek(service: MusicService, seconds: number): Promise<void>
  musicVolume(service: MusicService, volume: number): Promise<void> // 0 à 100
  musicOpen(service: MusicService): void // interface complète (navigation, connexion) ou app
  // File de YT Music : 20 morceaux au plus, le morceau en cours d'abord ; jouer l'un d'eux
  musicQueue(): Promise<MusicQueueItem[]>
  musicPlay(id: string): Promise<void>
  // Barre de commande
  search(query: string): Promise<SearchResult[]>
  openResult(id: string, inFolder: boolean): Promise<boolean> // true : ouvert, Photon se cache
  resultIcon(id: string): Promise<string | null>
  barResize(height: number): void // mini-mode : la fenêtre suit la hauteur de la barre
  // Petits widgets
  sharedLoad(key: string): Promise<unknown> // données partagées entre profils ; null si absentes
  sharedSave(key: string, value: unknown): Promise<void>
  pomodoro(): Promise<PomodoroState>
  pomodoroControl(command: PomodoroCommand, focus?: number, pause?: number): Promise<PomodoroState>
  weather(city: string): Promise<WeatherFeed | null> // cache seulement, aucun appel réseau
  network(): Promise<NetworkRate | null> // null : 1re lecture, la suivante donne le débit
  recentFiles(): Promise<RecentFile[]> // derniers fichiers et dossiers ouverts dans Windows
  pickFolders(): Promise<string[]> // boîte de dialogue ; [] si annulée
  // Son : null si l'outil natif ne répond pas ; chaque réglage renvoie le nouvel état
  audio(): Promise<AudioState | null>
  audioVolume(volume: number): Promise<AudioState | null> // 0 à 100
  audioMute(muted: boolean): Promise<AudioState | null>
  audioDevice(id: string): Promise<AudioState | null> // une sortie de la dernière liste lue
  // Widgets ajoutés après la V3
  claudeUsage(): Promise<ClaudeUsage> // 1re lecture lente (journaux), ensuite incrémentale
  clipboardHistory(): Promise<string[]> // textes copiés, le plus récent d'abord (en mémoire)
  clipboardClear(): void
  batteries(): Promise<Battery[] | null> // null : outil natif indisponible
  markets(symbols: string): Promise<MarketFeed> // cache seulement, aucun appel réseau
  processes(sort: 'cpu' | 'ram'): Promise<ProcessGroup[] | null> // 10 premiers ; null : outil absent
  processIcon(name: string): Promise<string | null>
  processClose(name: string): Promise<boolean> // fenêtres fermées comme la croix, sinon arrêt
  gitStatus(paths: string[]): Promise<GitRepo[]> // aucun appel réseau
  gitOpen(path: string): Promise<boolean> // ouvre dans VS Code puis cache Photon
  awake(): Promise<AwakeState>
  awakeStart(minutes: number | null, screen: boolean): Promise<AwakeState> // null : sans fin
  awakeStop(): Promise<AwakeState>
  eyes(): Promise<EyesState>
  eyesSet(on: boolean, minutes: number): Promise<EyesState> // 5 à 120 min
  // Thème
  pickFile(kind: 'image' | 'font'): Promise<string | null> // boîte de dialogue ; null si annulée
  // Copie chez Photon ; nom pour photon://images/<nom> ou photon://fonts/<nom>, null si refusé
  importFile(kind: 'image' | 'font', path: string): Promise<string | null>
}

declare global {
  interface Window {
    photon: PhotonApi
  }
}
