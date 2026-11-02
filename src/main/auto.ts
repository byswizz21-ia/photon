// Bascule automatique de profil (design doc) : en option, désactivée par défaut. Un profil
// s'active au lancement d'une de ses apps ou au début de sa plage horaire. Seules les
// transitions comptent : une bascule manuelle n'est jamais annulée tant que rien ne change.
// La bascule passe par l'interface (photon:switchTo), comme un clic sur une pastille.
import { execFile } from 'node:child_process'
import { basename, extname } from 'node:path'
import { shell } from 'electron'
import { isExeName, type AutoRules, type ProfileInfo } from '../shared/model'
import { data } from './data'
import { notify } from './notify'
import { pickApps } from './system'
import { send } from './window'

// tasklist : ≈ 110 ms de CPU par tour (≈ 0,7 % d'un cœur), seulement si l'option est active et
// qu'un profil a des apps. ponytail: liste native (EnumProcesses, ≈ 10 ms) si ça devient gênant.
const POLL_MS = 15_000

const minutes = (time: string): number => Number(time.slice(0, 2)) * 60 + Number(time.slice(3))

// Plage « 22:00 → 02:00 » : passe minuit, le jour compté est celui du début.
export function inHours(hours: AutoRules['hours'], date: Date): boolean {
  if (!hours) return false
  const now = date.getHours() * 60 + date.getMinutes()
  const [from, to] = [minutes(hours.from), minutes(hours.to)]
  if (from < to) return hours.days.includes(date.getDay()) && now >= from && now < to
  const startDay = now >= from ? date.getDay() : (date.getDay() + 6) % 7
  return hours.days.includes(startDay) && (now >= from || now < to)
}

// Profil à activer : une app vient de démarrer, sinon une plage horaire vient de commencer.
export function pickAuto(
  profiles: ProfileInfo[],
  active: string,
  started: ReadonlySet<string>,
  hoursNow: ReadonlySet<string>,
  hoursBefore: ReadonlySet<string>
): ProfileInfo | undefined {
  const others = profiles.filter((p) => p.id !== active)
  return (
    others.find((p) => p.auto.apps.some((app) => started.has(app))) ??
    others.find((p) => hoursNow.has(p.id) && !hoursBefore.has(p.id))
  )
}

function processes(): Promise<Set<string> | null> {
  return new Promise((resolve) => {
    execFile(
      'tasklist.exe',
      ['/fo', 'csv', '/nh'],
      { windowsHide: true, timeout: 5000 },
      (error, stdout) => {
        if (error) return resolve(null)
        // Ligne CSV : "nom.exe","pid",… → 1re colonne.
        const names = stdout.split(/\r?\n/).map((line) => /^"([^"]+)"/.exec(line)?.[1])
        resolve(new Set(names.filter((n) => n !== undefined).map((n) => n.toLowerCase())))
      }
    )
  })
}

let running: Set<string> | null = null // apps vues au tour précédent (null : 1er tour)
let hoursBefore = new Set<string>()

async function tick(): Promise<void> {
  if (!data.settings.autoProfiles) {
    running = null
    hoursBefore = new Set()
    return
  }
  const profiles = data.profiles
  const now = new Date()
  const hoursNow = new Set(profiles.filter((p) => inHours(p.auto.hours, now)).map((p) => p.id))
  let started = new Set<string>()
  if (profiles.some((p) => p.auto.apps.length)) {
    const current = await processes()
    if (current && running) started = new Set([...current].filter((app) => !running?.has(app)))
    if (current) running = current
  }
  // 1er tour (démarrage, option activée) : une plage horaire en cours compte comme un début.
  const target = pickAuto(profiles, data.settings.activeProfile, started, hoursNow, hoursBefore)
  hoursBefore = hoursNow
  if (target) switchTo(target)
}

function switchTo(target: ProfileInfo): void {
  const previous = data.profiles.find((p) => p.id === data.settings.activeProfile)
  console.log(`[photon] profil auto : ${target.name}`)
  send('photon:switchTo', target.id)
  if (!previous) return
  // Annuler : seulement si personne n'a changé de profil entre-temps.
  notify(
    {
      title: `Profil « ${target.name} » activé`,
      body: `Cliquer pour revenir à « ${previous.name} »`,
      silent: true
    },
    () => {
      if (data.settings.activeProfile === target.id) send('photon:switchTo', previous.id)
    }
  )
}

export function startAuto(): void {
  setInterval(() => void tick(), POLL_MS)
}

// Boîte « ajouter des apps » : exécutables seulement (cible des raccourcis .lnk).
export async function pickAutoApps(): Promise<string[]> {
  const names = (await pickApps()).map((path) => {
    let target = path
    if (extname(path).toLowerCase() === '.lnk') {
      try {
        target = shell.readShortcutLink(path).target
      } catch {
        return ''
      }
    }
    return basename(target).toLowerCase()
  })
  return [...new Set(names.filter(isExeName))]
}
