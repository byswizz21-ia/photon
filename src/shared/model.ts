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
}

export type Background =
  | { type: 'wallpaper' }
  | { type: 'image'; path: string }
  | { type: 'gradient'; from: string; to: string }

export type Density = 'compact' | 'comfortable'

export interface Theme {
  background: Background
  accent: 'auto' | string // 'auto' = extraite du fond, sinon '#rrggbb'
  blur: number // px, flou du panneau de verre en plein écran
  opacity: number // 0..1, opacité du verre
  radius: number // px, arrondi des cartes
  density: Density
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

export interface Profile {
  name: string
  createdAt: number // ms ; ordre des pastilles et de Ctrl+1, Ctrl+2…
  theme: string | null // thème attaché au profil, sinon thème global
  focus: boolean // profil Focus : « Ne pas déranger » + pomodoro à l'activation
  widgets: WidgetInstance[]
}

// Profil vu dans la liste : id = nom du fichier dans profiles/, sans .json.
export interface ProfileInfo {
  id: string
  name: string
  focus: boolean
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
  reduceMotion: false
})

export const defaultTheme = (): Theme => ({
  background: { type: 'wallpaper' },
  accent: 'auto',
  blur: 48,
  opacity: 0.5,
  radius: 20,
  density: 'comfortable'
})

export const defaultProfile = (): Profile => ({
  name: 'Principal',
  createdAt: 0,
  theme: null,
  focus: false,
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
    reduceMotion: typeof v.reduceMotion === 'boolean' ? v.reduceMotion : d.reduceMotion
  }
}

function parseBackground(v: unknown): Background {
  if (isObject(v)) {
    if (v.type === 'image' && typeof v.path === 'string' && v.path)
      return { type: 'image', path: v.path }
    if (v.type === 'gradient' && isHex(v.from) && isHex(v.to)) {
      return { type: 'gradient', from: v.from, to: v.to }
    }
  }
  return { type: 'wallpaper' }
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
    density: oneOf(v.density, ['compact', 'comfortable'], d.density)
  }
}

function parseWidget(v: unknown): WidgetInstance | null {
  if (!isObject(v) || typeof v.id !== 'string' || !v.id || !isName(v.type)) return null
  return {
    id: v.id,
    type: v.type,
    x: int(v.x, 0, 1000, 0),
    y: int(v.y, 0, 1000, 0),
    w: int(v.w, 1, 12, 1),
    h: int(v.h, 1, 100, 1),
    settings: isObject(v.settings) ? v.settings : {}
  }
}

export function parseProfile(raw: unknown): Profile {
  const v = root(raw)
  if (!Array.isArray(v.widgets)) throw new Error('Profil invalide : liste de widgets attendue')
  const widgets = v.widgets.map(parseWidget).filter((w) => w !== null)
  // Un id en double casserait la grille : on garde la première occurrence.
  const unique = widgets.filter((w, i) => widgets.findIndex((o) => o.id === w.id) === i)
  return {
    name:
      typeof v.name === 'string' && v.name.trim()
        ? v.name.trim().slice(0, MAX_PROFILE_NAME)
        : 'Principal',
    createdAt: num(v.createdAt, 0, Number.MAX_SAFE_INTEGER, 0),
    theme: isName(v.theme) ? v.theme : null,
    focus: v.focus === true,
    widgets: unique
  }
}
