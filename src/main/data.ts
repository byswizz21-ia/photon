// Fichiers de Photon dans %APPDATA%/Photon : chargement au démarrage, état courant, sauvegarde.
import { app } from 'electron'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import type { AppState } from '../shared/api'
import {
  defaultProfile,
  defaultSettings,
  defaultTheme,
  isName,
  parseProfile,
  PROFILE_VERSION,
  parseSettings,
  parseTheme,
  type Profile,
  type ProfileInfo,
  type Settings
} from '../shared/model'
import { TEMPLATES } from '../shared/templates'
import { THEME_PRESETS } from '../shared/themes'
import { pending, readJson, writeJson } from './store'

const file = (...parts: string[]): string => join(app.getPath('userData'), ...parts)
const settingsFile = (): string => file('settings.json')
const themeFile = (name: string): string => file('themes', `${name}.json`)
const profileFile = (name: string): string => file('profiles', `${name}.json`)

export const data: AppState = {
  settings: defaultSettings(),
  theme: defaultTheme(),
  profile: defaultProfile(),
  profiles: []
}

// Thème utilisé : celui attaché au profil, sinon le thème global.
const themeName = (): string => data.profile.theme ?? data.settings.theme

export async function loadAll(): Promise<void> {
  data.settings = await readJson(settingsFile(), parseSettings, defaultSettings)
  data.profile = await readJson(
    profileFile(data.settings.activeProfile),
    parseProfile,
    defaultProfile
  )
  data.theme = await readJson(themeFile(themeName()), parseTheme, defaultTheme)
  data.profiles = await listProfiles()
}

const info = (id: string, p: Profile): ProfileInfo => ({
  id,
  name: p.name,
  focus: p.focus,
  auto: p.auto
})

// Tous les profils de profiles/, du plus ancien au plus récent. Lu au démarrage seulement.
async function listProfiles(): Promise<ProfileInfo[]> {
  const files = await fs.readdir(file('profiles')).catch(() => [] as string[])
  const ids = files.map((name) => name.replace(/\.json$/, '')).filter(isName)
  const found = await Promise.all(
    ids.map(async (id) => ({
      id,
      profile: await readJson<Profile | null>(profileFile(id), parseProfile, () => null)
    }))
  )
  const list = found.filter((f): f is { id: string; profile: Profile } => f.profile !== null)
  // Premier lancement : le profil actif n'existe pas encore sur le disque.
  const active = data.settings.activeProfile
  if (!list.some((f) => f.id === active)) list.push({ id: active, profile: data.profile })
  return list
    .sort((a, b) => a.profile.createdAt - b.profile.createdAt || a.id.localeCompare(b.id))
    .map(({ id, profile }) => info(id, profile))
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  data.settings = parseSettings({ ...data.settings, ...patch })
  await writeJson(settingsFile(), data.settings, parseSettings)
  return data.settings
}

export async function saveTheme(raw: unknown): Promise<void> {
  data.theme = parseTheme(raw)
  await writeJson(themeFile(themeName()), data.theme, parseTheme)
}

// Le fichier visé est fixé dès l'appel : une sauvegarde arrivée avant une bascule (les messages
// de l'interface arrivent dans l'ordre) va bien dans l'ancien profil.
export async function saveProfile(raw: unknown): Promise<void> {
  const id = data.settings.activeProfile
  data.profile = parseProfile(raw)
  data.profiles = data.profiles.map((p) => (p.id === id ? info(id, data.profile) : p))
  await writeJson(profileFile(id), data.profile, parseProfile)
}

// Bascule : profil, puis son thème (attaché, sinon global). false : profil inconnu.
export async function switchProfile(id: unknown): Promise<boolean> {
  if (typeof id !== 'string' || !data.profiles.some((p) => p.id === id)) return false
  const profile = await readJson(profileFile(id), parseProfile, defaultProfile)
  data.profile = profile
  await saveSettings({ activeProfile: id })
  data.theme = await readJson(themeFile(themeName()), parseTheme, defaultTheme)
  return true
}

// Nouveau profil depuis un modèle, une copie du profil actif ou vierge, puis bascule dessus.
// Id = horodatage : jamais de nom réservé par Windows (con, nul…), le nom affiché est libre.
export async function createProfile(source: unknown): Promise<boolean> {
  const template =
    typeof source === 'string' && Object.hasOwn(TEMPLATES, source) ? TEMPLATES[source] : undefined
  const base =
    source === 'duplicate'
      ? { ...structuredClone(data.profile), name: `${data.profile.name} (copie)` }
      : source === 'blank'
        ? { name: 'Nouveau profil', theme: null, widgets: [] }
        : template && {
            name: template.name,
            theme: template.theme ?? null,
            focus: template.focus === true,
            widgets: template.widgets()
          }
  if (!base) return false
  await ensurePresetTheme(template?.theme)
  // Modèles et profil vierge sont au format actuel : aucune conversion à leur appliquer.
  const profile = parseProfile({ version: PROFILE_VERSION, ...base, createdAt: Date.now() })
  let n = profile.createdAt
  while (data.profiles.some((p) => p.id === `p${n.toString(36)}`)) n++
  const id = `p${n.toString(36)}`
  await writeJson(profileFile(id), profile, parseProfile)
  data.profiles = [...data.profiles, info(id, profile)]
  return switchProfile(id)
}

// Thème prêt d'un modèle : écrit dans themes/ s'il n'existe pas (jamais écrasé : les réglages
// faits depuis sont gardés).
async function ensurePresetTheme(name: string | undefined): Promise<void> {
  const preset = name && Object.hasOwn(THEME_PRESETS, name) ? THEME_PRESETS[name] : undefined
  if (!name || !preset) return
  const exists = await fs.access(themeFile(name)).then(
    () => true,
    () => false
  )
  if (!exists) await writeJson(themeFile(name), preset.theme(), parseTheme)
}

// Supprime le profil actif (jamais le dernier) et bascule sur un autre. Le fichier est mis de
// côté en .deleted, pas effacé : récupérable à la main.
export async function deleteProfile(): Promise<boolean> {
  const id = data.settings.activeProfile
  const next = data.profiles.find((p) => p.id !== id)
  if (!next || !(await switchProfile(next.id))) return false
  data.profiles = data.profiles.filter((p) => p.id !== id)
  await pending(profileFile(id))
  await fs.rename(profileFile(id), `${profileFile(id)}.deleted`).catch(() => undefined)
  return true
}
