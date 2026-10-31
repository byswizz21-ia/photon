// Fichiers de Photon dans %APPDATA%/Photon : chargement au démarrage, état courant, sauvegarde.
import { app } from 'electron'
import { join } from 'node:path'
import {
  defaultProfile,
  defaultSettings,
  defaultTheme,
  parseProfile,
  parseSettings,
  parseTheme,
  type Settings
} from '../shared/model'
import { readJson, writeJson } from './store'

const file = (...parts: string[]): string => join(app.getPath('userData'), ...parts)
const settingsFile = (): string => file('settings.json')
const themeFile = (name: string): string => file('themes', `${name}.json`)
const profileFile = (name: string): string => file('profiles', `${name}.json`)

export const data = {
  settings: defaultSettings(),
  theme: defaultTheme(),
  profile: defaultProfile()
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

export async function saveProfile(raw: unknown): Promise<void> {
  data.profile = parseProfile(raw)
  await writeJson(profileFile(data.settings.activeProfile), data.profile, parseProfile)
}
