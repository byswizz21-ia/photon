// Apps du menu Démarrer pour la barre de commande : raccourcis .lnk (icône lisible) et apps du
// Microsoft Store (Get-StartApps, lancées par shell:AppsFolder). Lu au démarrage puis toutes les 30 min.
import { app } from 'electron'
import { execFile, spawn } from 'node:child_process'
import { readdir } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import { normalize } from './rank'

export interface AppEntry {
  name: string
  path: string | null // raccourci .lnk
  appId: string | null // app du Store
}

const REFRESH_MS = 30 * 60_000
let apps: AppEntry[] = []

export const listApps = (): readonly AppEntry[] => apps

const startMenus = (): string[] => [
  join(
    process.env['ProgramData'] ?? 'C:\\ProgramData',
    'Microsoft',
    'Windows',
    'Start Menu',
    'Programs'
  ),
  join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs')
]

async function shortcuts(dir: string): Promise<AppEntry[]> {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true }).catch(() => [])
  return entries
    .filter((e) => e.isFile() && extname(e.name).toLowerCase() === '.lnk')
    .filter((e) => !/uninstall|désinstall/i.test(e.name))
    .map((e) => ({ name: basename(e.name, '.lnk'), path: join(e.parentPath, e.name), appId: null }))
}

// Apps du Store : leur identifiant contient « ! » (les autres sont déjà des raccourcis .lnk).
function storeApps(): Promise<AppEntry[]> {
  const command =
    '[Console]::OutputEncoding = [Text.Encoding]::UTF8; Get-StartApps | ConvertTo-Json -Compress'
  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', command],
      { windowsHide: true, timeout: 20_000, maxBuffer: 8 * 1024 * 1024 },
      (error, stdout) => {
        try {
          if (error) throw error
          const raw: unknown = JSON.parse(stdout)
          const list = (Array.isArray(raw) ? raw : [raw]) as { Name?: unknown; AppID?: unknown }[]
          resolve(
            list
              .filter((a) => typeof a.Name === 'string' && typeof a.AppID === 'string')
              .filter((a) => (a.AppID as string).includes('!'))
              .map((a) => ({ name: a.Name as string, path: null, appId: a.AppID as string }))
          )
        } catch {
          resolve([])
        }
      }
    )
  })
}

async function refresh(): Promise<void> {
  const found = (await Promise.all([...startMenus().map(shortcuts), storeApps()])).flat()
  // Même nom deux fois (menu de l'utilisateur et menu commun) : on garde le premier.
  const seen = new Set<string>()
  apps = found.filter((a) => {
    const key = normalize(a.name)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function startApps(): void {
  void refresh()
  setInterval(() => void refresh(), REFRESH_MS)
}

// Identifiant venu de notre propre liste seulement.
export function launchStoreApp(appId: string): void {
  if (!apps.some((a) => a.appId === appId)) return
  spawn('explorer.exe', [`shell:AppsFolder\\${appId}`], { detached: true, windowsHide: true })
    .on('error', (error) => console.warn(`[photon] app du Store introuvable (${error.message})`))
    .unref()
}
