// Accès au système pour les widgets : CPU, RAM, disques, icônes et lancement d'apps.
// Node pur (os, fs.statfs) : quelques ms par lecture, contre 0,4 à 1 s pour systeminformation
// qui lance PowerShell à chaque appel (mesuré sur la machine cible).
import { app, dialog, shell } from 'electron'
import { promises as fs } from 'node:fs'
import { cpus, freemem, totalmem } from 'node:os'
import { extname, isAbsolute, join } from 'node:path'
import type { CpuRam, Disk } from '../shared/api'
import { withModal } from './window'

const DRIVE_LETTERS = [...'CDEFGHIJKLMNOPQRSTUVWXYZ']

let lastCpu = cpuTimes()

function cpuTimes(): { idle: number; total: number } {
  let idle = 0
  let total = 0
  for (const { times } of cpus()) {
    idle += times.idle
    total += times.user + times.nice + times.sys + times.idle + times.irq
  }
  return { idle, total }
}

// CPU : part du temps actif depuis la lecture précédente. RAM : mémoire physique utilisée.
export function cpuRam(): CpuRam {
  const now = cpuTimes()
  const total = now.total - lastCpu.total
  const idle = now.idle - lastCpu.idle
  lastCpu = now
  const ramTotal = totalmem()
  return {
    cpu: total > 0 ? 100 * (1 - idle / total) : 0,
    ramUsed: ramTotal - freemem(),
    ramTotal
  }
}

// Lecteurs C: à Z: présents, lus en parallèle : un lecteur réseau lent ne retarde pas les autres.
export async function disks(): Promise<Disk[]> {
  const found = await Promise.all(
    DRIVE_LETTERS.map(async (letter): Promise<Disk | null> => {
      try {
        const stats = await fs.statfs(`${letter}:\\`)
        if (stats.blocks <= 0) return null
        return {
          mount: `${letter}:`,
          total: stats.blocks * stats.bsize,
          free: stats.bavail * stats.bsize
        }
      } catch {
        return null // lettre absente ou lecteur sans support
      }
    })
  )
  return found.filter((disk) => disk !== null)
}

// Icône d'une app (data URL PNG, 32 px). Pour un raccourci .lnk, Electron rendrait une icône
// générique : on lit l'icône déclarée par le raccourci, sinon celle de sa cible.
export async function fileIcon(path: string): Promise<string | null> {
  if (!isAbsolute(path)) return null
  const candidates = [path]
  if (extname(path).toLowerCase() === '.lnk') {
    try {
      const { icon, target } = shell.readShortcutLink(path)
      candidates.unshift(...[icon, target].filter((p): p is string => Boolean(p)))
    } catch {
      // raccourci illisible : icône du fichier lui-même
    }
  }
  for (const candidate of candidates) {
    try {
      const icon = await app.getFileIcon(candidate, { size: 'large' })
      if (!icon.isEmpty()) return icon.toDataURL()
    } catch {
      // fichier introuvable : candidat suivant
    }
  }
  return null
}

// Ouvre une app, un raccourci ou un dossier. Renvoie false si Windows n'a rien pu ouvrir.
export async function launch(path: string): Promise<boolean> {
  if (!isAbsolute(path)) return false
  const error = await shell.openPath(path)
  if (error) console.warn(`[photon] lancement impossible : ${path} (${error})`)
  return error === ''
}

// Boîte « ajouter des apps », ouverte sur les raccourcis du menu Démarrer.
export async function pickApps(): Promise<string[]> {
  const result = await withModal((parent) =>
    dialog.showOpenDialog(parent, {
      title: 'Ajouter des apps',
      defaultPath: join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Apps et raccourcis', extensions: ['lnk', 'exe', 'url'] }]
    })
  )
  return result.canceled ? [] : result.filePaths
}
