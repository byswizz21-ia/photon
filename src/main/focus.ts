// Profil Focus (design doc) : active « Ne pas déranger » de Windows et lance le pomodoro. En
// quittant le profil (ou Photon), Windows retrouve le réglage d'avant le Focus.
import source from './focus.cs?raw'
import { nativeTool } from './native'
import { pomodoro, pomodoroControl, setReminders } from './pomodoro'

const tool = nativeTool(source, 'Photon.Dnd')
const DND_ON = 'Microsoft.QuietHoursProfile.PriorityOnly'
const DND_OFF = 'Microsoft.QuietHoursProfile.Unrestricted' // réglage par défaut de Windows
const PROFILE = /^Microsoft\.QuietHoursProfile\.\w+$/ // seule valeur transmise à l'outil

let active = false
let before: string | null = null // réglage de Windows avant le Focus
let queue = Promise.resolve() // bascules rapides : appliquées dans l'ordre

async function setDnd(profile: string): Promise<void> {
  if (!PROFILE.test(profile)) return
  const reply = await tool.send(`set ${profile}`)
  if (reply !== 'ok') console.warn(`[photon] ne pas déranger : ${reply ?? 'outil indisponible'}`)
}

async function apply(on: boolean): Promise<void> {
  if (on === active) return
  active = on
  setReminders(on) // fins de pomodoro en rappels : ils passent « Ne pas déranger »
  if (on) {
    if (pomodoro().phase === 'idle') pomodoroControl('start')
    // Réglage d'avant illisible : on rendra « désactivé », sinon Windows resterait en Ne pas déranger.
    const current = await tool.send('get')
    before = current && PROFILE.test(current) ? current : DND_OFF
    if (before !== DND_ON) await setDnd(DND_ON)
    console.log(`[photon] focus activé (avant : ${current ?? 'illisible'})`)
  } else {
    // Déjà actif avant le Focus : on ne touche à rien.
    if (before && before !== DND_ON) await setDnd(before)
    before = null
    console.log('[photon] focus désactivé')
  }
}

// Mépris (widget Sorts, barre) : bascule « Ne pas déranger » de Windows, dans la file des
// bascules du Focus. true : activé, false : coupé ; null : outil indisponible.
export function dndToggle(): Promise<boolean | null> {
  const next = queue.then(async () => {
    const current = await tool.send('get')
    if (!current || !PROFILE.test(current)) return null
    const on = current !== DND_ON
    await setDnd(on ? DND_ON : DND_OFF)
    return on
  })
  queue = next.then(() => undefined)
  return next
}

// Moment pour une notification : jeu ou présentation en plein écran, Ne pas déranger, ou libre.
// null : outil indisponible (on fait comme si l'écran était libre).
export type Quiet = 'fullscreen' | 'dnd' | null

export async function quietState(): Promise<Quiet> {
  const reply = await tool.send('quiet', 2000)
  return reply === 'fullscreen' || reply === 'dnd' ? reply : null
}

// Appelé à chaque changement de profil (ou de son option Focus). Pas au démarrage : Photon
// lancé avec Windows n'active rien tout seul.
export function syncFocus(on: boolean): Promise<void> {
  queue = queue.then(() => apply(on))
  return queue
}

// Fermeture de Photon : attendue avant de quitter (src/main/index.ts), Windows retrouve son réglage.
export const leaveFocus = (): Promise<void> => syncFocus(false)
