// Modèle de données de Photon : types, valeurs par défaut et validation des JSON lus sur disque.
// Les fonctions parse* reçoivent du JSON brut (non fiable) et renvoient un objet valide :
// champ absent ou invalide → valeur par défaut ; racine invalide → erreur (le store passe au .bak).

export type WindowMode = 'fullscreen' | 'window'

export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

export interface Settings {
  shortcut: string // accélérateur Electron, ex. "Super+Shift+Space"
  barShortcut: string // mini-mode : la barre de commande seule
  mode: WindowMode
  alwaysOnTop: boolean // mode fenêtre uniquement
  windowBounds: Bounds | null // dernière position en mode fenêtre
  windowBoundsByScreens: Record<string, Bounds> // la même, par configuration d'écrans
  screen: string // 'mouse' (écran de la souris), 'primary' (principal) ou id d'un écran
  activeProfile: string // nom de fichier dans profiles/, sans .json
  theme: string // thème global, nom de fichier dans themes/
  reduceMotion: boolean
  autoProfiles: boolean // bascule automatique selon les règles des profils
  liveBlur: boolean // mode fenêtre : flou fait par Photon (capture de l'écran), réglable
  sound: SoundSettings
  notifications: NotifySettings
  introSeen: boolean // animation de première ouverture déjà vue (ou passée)
}

// Notifications de Photon, par source : [nom, quand elle arrive]. L'avertissement du
// minuteur d'arrêt n'est pas listé : il part toujours (sinon le PC s'éteindrait sans prévenir).
export const NOTIFY_SOURCES = {
  calendar: ['Agenda', 'Avant chaque événement (délai réglé dans le widget)'],
  countdown: ['Compte à rebours', 'La veille et le jour J, à partir de 9 h'],
  micro: ['Micro-entreprise', 'Déclaration URSSAF : 7 jours avant, puis le dernier jour'],
  timetrack: ['Suivi du temps', 'Chrono qui tourne depuis plus de 4 h'],
  pomodoro: ['Pomodoro', 'Fin du travail et de la pause'],
  eyes: ['Pause des yeux', 'Regarder au loin, à intervalle réglé dans le widget'],
  claude: ['Claude', "Demande d'accord, Photon caché"],
  music: ['Musique', 'Changement de morceau (option de chaque lecteur)'],
  profiles: ['Profils automatiques', 'Bascule vers un autre profil']
} as const
export type NotifySource = keyof typeof NOTIFY_SOURCES

export type NotifyStyle = 'photon' | 'windows' // cartes de Photon, ou notifications de Windows

export interface NotifySettings {
  enabled: boolean
  style: NotifyStyle
  sources: Record<string, boolean> // source absente = activée ; inconnues gardées (retour en arrière)
}

// Sons de l'interface (src/renderer/sound.svelte.ts), par famille.
// Ambiances sonores : [nom, caractère]. Les trois premières sont synthétisées, les autres
// jouent des fichiers (src/renderer/sounds/).
export const SOUND_PRESETS = {
  glass: ['Verre', 'Cloches de verre, claires'],
  wood: ['Bois', 'Marimba feutré, chaleureux'],
  air: ['Souffle', 'De l’air, presque rien'],
  sine: ['Onde', 'Sinusoïdes pures, très courtes'],
  piano: ['Piano', 'Notes de piano, amples'],
  industrial: ['Industriel', 'Métal et mécanique, précis'],
  tactile: ['Tactile', 'Clics et touches, comme un vrai bouton']
} as const

export type SoundPreset = keyof typeof SOUND_PRESETS

export interface SoundSettings {
  enabled: boolean
  preset: SoundPreset
  volume: number // 0..1, volume propre à Photon (celui de Windows n'est jamais touché)
  window: boolean // ouverture et fermeture de Photon
  clicks: boolean // boutons, cases, réglages, profils
  grid: boolean // mode édition : ajouter, supprimer, poser un widget
}

export type Background =
  | { type: 'wallpaper' }
  | { type: 'image'; path: string }
  | { type: 'gradient'; from: string; to: string }
  | { type: 'glow' } // scène colorée de Photon (Background.svelte)

export type Density = 'compact' | 'comfortable'

// Police de toute l'interface (thème).
export interface FontSettings {
  family: string // '' = Satoshi (police de Photon) ; « file:<nom> » = police importée ; sinon police Windows
  weight: number // décalage de graisse ajouté à tous les textes, -200 (fin) à +300 (gras)
  scale: number // taille des textes, 0,8 à 1,4
}

export interface Theme {
  background: Background
  accent: 'auto' | string // 'auto' = extraite du fond, sinon '#rrggbb'
  blur: number // px, flou du panneau de verre en plein écran
  opacity: number // 0..1, opacité du verre
  radius: number // px, arrondi des cartes
  density: Density
  font: FontSettings
}

export interface WidgetInstance {
  id: string
  type: string // nom du dossier dans src/renderer/widgets/
  x: number
  y: number
  w: number
  h: number
  settings: Record<string, unknown>
}

// Bascule automatique vers un profil (réglage autoProfiles) : au lancement d'une de ces apps,
// ou au début de la plage horaire.
export interface AutoRules {
  apps: string[] // exécutables en minuscules, ex. « geometrydash.exe »
  hours: { from: string; to: string; days: number[] } | null // « HH:MM », jours 0 = dimanche
}

export interface Profile {
  version: number // format du fichier (PROFILE_VERSION) : dit quelles conversions lui appliquer
  name: string
  createdAt: number // ms ; ordre des pastilles et de Ctrl+1, Ctrl+2…
  theme: string | null // thème attaché au profil, sinon thème global
  focus: boolean // profil Focus : « Ne pas déranger » + pomodoro à l'activation
  auto: AutoRules
  widgets: WidgetInstance[]
}

// Profil vu dans la liste : id = nom du fichier dans profiles/, sans .json.
export interface ProfileInfo {
  id: string
  name: string
  focus: boolean
  auto: AutoRules
}

export const MAX_PROFILE_NAME = 40

// Win+Shift+Espace est réservé par Windows (changement de langue) : register() échoue, testé.
export const SHORTCUTS = ['Super+Alt+Space', 'Super+Shift+Space', 'Ctrl+Alt+Space'] as const
// Alt+Espace : comme PowerToys Run (remplace le menu système de la fenêtre active).
// Pas Ctrl+Espace : pris par les éditeurs de code et les claviers asiatiques.
export const BAR_SHORTCUTS = ['Alt+Space', 'Super+Ctrl+Space', 'Ctrl+Shift+Space'] as const
export const DEFAULT_ACCENT = '#7CC4FF'

// 'Super+Alt+Space' → 'Win+Alt+Espace'
export const shortcutLabel = (accelerator: string): string =>
  accelerator.replace('Super', 'Win').replace('Shift', 'Maj').replace('Space', 'Espace')

export const defaultSettings = (): Settings => ({
  shortcut: SHORTCUTS[0],
  barShortcut: BAR_SHORTCUTS[0],
  mode: 'fullscreen',
  alwaysOnTop: false,
  windowBounds: null,
  windowBoundsByScreens: {},
  screen: 'mouse',
  activeProfile: 'default',
  theme: 'default',
  reduceMotion: false,
  autoProfiles: false,
  liveBlur: false,
  sound: defaultSound(),
  notifications: { enabled: true, style: 'photon', sources: {} },
  introSeen: false
})

export const defaultSound = (): SoundSettings => ({
  enabled: true,
  preset: 'glass',
  volume: 0.5,
  window: true,
  clicks: true,
  grid: true
})

export const defaultTheme = (): Theme => ({
  background: { type: 'wallpaper' },
  accent: 'auto',
  blur: 48,
  opacity: 0.5,
  radius: 24,
  density: 'comfortable',
  font: { family: '', weight: 0, scale: 1 }
})

export const defaultProfile = (): Profile => ({
  version: PROFILE_VERSION,
  name: 'Principal',
  createdAt: 0,
  theme: null,
  focus: false,
  auto: { apps: [], hours: null },
  widgets: [
    { id: 'clock', type: 'clock', x: 0, y: 0, w: 6, h: 2, settings: {} },
    { id: 'system', type: 'system', x: 6, y: 0, w: 3, h: 2, settings: {} },
    { id: 'disks', type: 'disks', x: 9, y: 0, w: 3, h: 2, settings: {} },
    { id: 'launcher', type: 'launcher', x: 0, y: 2, w: 12, h: 2, settings: {} }
  ]
})

type Json = Record<string, unknown>

const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v)
const isHex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)
export const isName = (v: unknown): v is string => typeof v === 'string' && /^[\w-]{1,64}$/.test(v)

function num(v: unknown, min: number, max: number, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback
}

function int(v: unknown, min: number, max: number, fallback: number): number {
  return Math.round(num(v, min, max, fallback))
}

function oneOf<T extends string>(v: unknown, options: readonly T[], fallback: T): T {
  return options.includes(v as T) ? (v as T) : fallback
}

function root(raw: unknown): Json {
  if (!isObject(raw)) throw new Error('JSON invalide : objet attendu')
  return raw
}

function parseBounds(v: unknown): Bounds | null {
  if (!isObject(v)) return null
  const { x, y, width, height } = v
  const ok = [x, y, width, height].every((n) => typeof n === 'number' && Number.isFinite(n))
  return ok
    ? { x: x as number, y: y as number, width: width as number, height: height as number }
    : null
}

const MAX_SCREEN_SETUPS = 10 // configurations d'écrans mémorisées

function parseBoundsMap(v: unknown): Record<string, Bounds> {
  if (!isObject(v)) return {}
  const entries = Object.entries(v)
    .map(([key, value]) => [key.slice(0, 500), parseBounds(value)] as const)
    .filter((entry): entry is readonly [string, Bounds] => entry[1] !== null)
  return Object.fromEntries(entries.slice(-MAX_SCREEN_SETUPS))
}

function parseSound(v: unknown): SoundSettings {
  const d = defaultSound()
  if (!isObject(v)) return d
  const flag = (value: unknown, fallback: boolean): boolean =>
    typeof value === 'boolean' ? value : fallback
  return {
    enabled: flag(v.enabled, d.enabled),
    preset:
      typeof v.preset === 'string' && Object.hasOwn(SOUND_PRESETS, v.preset)
        ? (v.preset as SoundPreset)
        : d.preset,
    volume: num(v.volume, 0, 1, d.volume),
    window: flag(v.window, d.window),
    clicks: flag(v.clicks, d.clicks),
    grid: flag(v.grid, d.grid)
  }
}

function parseNotify(v: unknown): NotifySettings {
  if (!isObject(v)) return { enabled: true, style: 'photon', sources: {} }
  const sources = isObject(v.sources)
    ? Object.fromEntries(
        Object.entries(v.sources).filter(([key, on]) => isName(key) && typeof on === 'boolean')
      )
    : {}
  return {
    enabled: v.enabled !== false,
    style: v.style === 'windows' ? 'windows' : 'photon',
    sources: sources as Record<string, boolean>
  }
}

export function parseSettings(raw: unknown): Settings {
  const v = root(raw)
  const d = defaultSettings()
  return {
    shortcut: typeof v.shortcut === 'string' && v.shortcut ? v.shortcut : d.shortcut,
    barShortcut: typeof v.barShortcut === 'string' && v.barShortcut ? v.barShortcut : d.barShortcut,
    mode: oneOf(v.mode, ['fullscreen', 'window'], d.mode),
    alwaysOnTop: typeof v.alwaysOnTop === 'boolean' ? v.alwaysOnTop : d.alwaysOnTop,
    windowBounds: parseBounds(v.windowBounds),
    windowBoundsByScreens: parseBoundsMap(v.windowBoundsByScreens),
    screen:
      typeof v.screen === 'string' && /^(mouse|primary|\d{1,20})$/.test(v.screen)
        ? v.screen
        : d.screen,
    activeProfile: isName(v.activeProfile) ? v.activeProfile : d.activeProfile,
    theme: isName(v.theme) ? v.theme : d.theme,
    reduceMotion: typeof v.reduceMotion === 'boolean' ? v.reduceMotion : d.reduceMotion,
    autoProfiles: v.autoProfiles === true,
    liveBlur: v.liveBlur === true,
    sound: parseSound(v.sound),
    notifications: parseNotify(v.notifications),
    introSeen: v.introSeen === true
  }
}

function parseBackground(v: unknown): Background {
  if (isObject(v)) {
    if (v.type === 'image' && typeof v.path === 'string' && v.path)
      return { type: 'image', path: v.path }
    if (v.type === 'gradient' && isHex(v.from) && isHex(v.to)) {
      return { type: 'gradient', from: v.from, to: v.to }
    }
    if (v.type === 'glow') return { type: 'glow' }
  }
  return { type: 'wallpaper' }
}

// Nom de police écrit tel quel dans le CSS (entre guillemets) : pas de guillemet ni d'accolade.
const isFontFamily = (v: unknown): v is string =>
  typeof v === 'string' && /^[^"'\\;{}<>]{0,100}$/.test(v)

function parseFont(v: unknown): FontSettings {
  const d = defaultTheme().font
  if (!isObject(v)) return d
  return {
    family: isFontFamily(v.family) ? v.family.trim() : d.family,
    weight: Math.round(num(v.weight, -200, 300, d.weight) / 50) * 50,
    scale: num(v.scale, 0.8, 1.4, d.scale)
  }
}

export function parseTheme(raw: unknown): Theme {
  const v = root(raw)
  const d = defaultTheme()
  return {
    background: parseBackground(v.background),
    accent: v.accent === 'auto' || isHex(v.accent) ? (v.accent as string) : d.accent,
    blur: int(v.blur, 0, 120, d.blur),
    opacity: num(v.opacity, 0, 1, d.opacity),
    radius: int(v.radius, 0, 40, d.radius),
    density: oneOf(v.density, ['compact', 'comfortable'], d.density),
    font: parseFont(v.font)
  }
}

function parseWidget(v: unknown): WidgetInstance | null {
  if (!isObject(v) || typeof v.id !== 'string' || !v.id || !isName(v.type)) return null
  return {
    ...v, // champs d'une autre version de Photon : gardés tels quels, ignorés ici
    id: v.id,
    type: v.type,
    x: int(v.x, 0, 1000, 0),
    y: int(v.y, 0, 1000, 0),
    w: int(v.w, 1, 12, 1),
    h: int(v.h, 1, 100, 1),
    settings: isObject(v.settings) ? v.settings : {}
  }
}

const MAX_AUTO_APPS = 20
export const isExeName = (v: unknown): v is string =>
  typeof v === 'string' && /^[\w .()+-]{1,80}\.exe$/i.test(v)
const isTime = (v: unknown): v is string =>
  typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v)

export function parseAuto(v: unknown): AutoRules {
  if (!isObject(v)) return { apps: [], hours: null }
  const apps = Array.isArray(v.apps) ? v.apps.filter(isExeName).map((a) => a.toLowerCase()) : []
  const h = v.hours
  const days =
    isObject(h) && Array.isArray(h.days)
      ? [...new Set(h.days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort(
          (a, b) => a - b
        )
      : []
  const hours =
    isObject(h) && isTime(h.from) && isTime(h.to) && h.from !== h.to
      ? { from: h.from, to: h.to, days: days as number[] }
      : null
  return { apps: [...new Set(apps)].slice(0, MAX_AUTO_APPS), hours }
}

// Conversions du format des profils : MIGRATIONS[n] passe un profil de la version n à n + 1.
// Renommer un widget ou une clé de réglage, changer un type = ajouter une étape à la fin (avec
// test), ne jamais modifier une étape publiée. Exemple, widget « gif » renommé « animation » :
// l'étape parcourt p.widgets et remplace type 'gif' par 'animation'.
type Migration = (profile: Json) => Json
const MIGRATIONS: Migration[] = [
  (p) => p // 0 → 1 : profils d'avant la numérotation, même format
]
export const PROFILE_VERSION = MIGRATIONS.length

// Applique les étapes manquantes. Profil d'une version plus récente : laissé tel quel (la
// validation garde ce qu'elle comprend, le reste est conservé).
export function migrateProfile(v: Json, steps: Migration[] = MIGRATIONS): Json {
  const from = int(v.version, 0, Number.MAX_SAFE_INTEGER, 0)
  let profile = v
  for (let n = from; n < steps.length; n++) profile = root(steps[n]!(profile))
  return { ...profile, version: Math.max(from, steps.length) }
}

export function parseProfile(raw: unknown): Profile {
  const v = migrateProfile(root(raw))
  if (!Array.isArray(v.widgets)) throw new Error('Profil invalide : liste de widgets attendue')
  const widgets = v.widgets.map(parseWidget).filter((w) => w !== null)
  // Un id en double casserait la grille : on garde la première occurrence.
  const unique = widgets.filter((w, i) => widgets.findIndex((o) => o.id === w.id) === i)
  return {
    ...v, // champs d'une autre version de Photon : gardés tels quels
    version: v.version as number,
    name:
      typeof v.name === 'string' && v.name.trim()
        ? v.name.trim().slice(0, MAX_PROFILE_NAME)
        : 'Principal',
    createdAt: num(v.createdAt, 0, Number.MAX_SAFE_INTEGER, 0),
    theme: isName(v.theme) ? v.theme : null,
    focus: v.focus === true,
    auto: parseAuto(v.auto),
    widgets: unique
  }
}
