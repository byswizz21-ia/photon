// Notifications de Photon : toutes passent ici. Chaque source se coupe dans Réglages ›
// Notifications ; 'always' (avertissement avant un arrêt du PC) part quoi qu'il arrive.
// Style « Photon » : cartes de verre dans un coin de l'écran (src/main/toast.ts). Jeu ou
// présentation en plein écran, ou Ne pas déranger : Windows reprend la main (centre de
// notifications), sauf les rappels qui doivent passer (sticky).
import { nativeImage, Notification, type NotificationConstructorOptions } from 'electron'
import type { NotifySettings, NotifySource } from '../shared/model'
import { data } from './data'
import { quietState, type Quiet } from './focus'
import { showToast } from './toast'
import { isVisible, showWindow } from './window'

export interface NotifyOptions {
  title: string
  body?: string
  image?: string // data: URL (pochette)
  silent?: boolean
  sticky?: boolean // reste jusqu'au clic et passe Ne pas déranger (rappel, arrêt du PC)
  actions?: { label: string; run: () => void }[] // boutons, cartes de Photon seulement
}

type Source = NotifySource | 'always' | 'test'

const MAX_KEPT = 20 // celles restées dans le centre de notifications : les plus anciennes partent
const kept = new Set<Notification>()

export const notifyAllowed = (source: Source): boolean => {
  const { enabled, sources } = data.settings.notifications
  return source === 'always' || source === 'test' || (enabled && sources[source] !== false)
}

// Où l'afficher. Photon ouvert : toujours chez lui (il est au premier plan, même plein écran).
export function delivery(
  settings: Pick<NotifySettings, 'style'>,
  quiet: Quiet,
  photonVisible: boolean,
  sticky: boolean
): 'photon' | 'windows' {
  if (settings.style === 'windows') return 'windows'
  if (photonVisible) return 'photon'
  if (quiet === 'fullscreen') return 'windows'
  if (quiet === 'dnd' && !sticky) return 'windows'
  return 'photon'
}

export function notify(
  source: Source,
  options: NotifyOptions,
  onClick: () => void = () => void showWindow()
): void {
  if (!notifyAllowed(source)) return
  void (async () => {
    const { notifications } = data.settings
    const visible = isVisible()
    // L'outil natif n'est interrogé que s'il peut changer la réponse.
    const quiet = notifications.style === 'photon' && !visible ? await quietState() : null
    if (delivery(notifications, quiet, visible, options.sticky === true) === 'photon') {
      showToast(source, options, onClick)
    } else windowsNotify(options, onClick)
  })()
}

const xml = (text: string): string => text.replace(/[<>&"]/g, (c) => `&#${c.charCodeAt(0)};`)

// Rappel : passe « Ne pas déranger » (réglage par défaut de Windows 11) et reste affiché
// jusqu'au clic sur OK.
const reminderXml = (title: string, body: string): string =>
  `<toast scenario="reminder"><visual><binding template="ToastGeneric"><text>${xml(title)}</text>` +
  `<text>${xml(body)}</text></binding></visual><actions>` +
  `<action content="OK" arguments="dismiss" activationType="system"/></actions></toast>`

// Chaque notification Windows est gardée en mémoire : libérée par le ramasse-miettes, son clic
// ne ferait plus rien.
function windowsNotify(options: NotifyOptions, onClick: () => void): void {
  if (!Notification.isSupported()) return
  const { title, body = '', image, silent, sticky } = options
  const native: NotificationConstructorOptions = sticky
    ? { title, toastXml: reminderXml(title, body) }
    : { title, body, silent, ...(image ? { icon: nativeImage.createFromDataURL(image) } : {}) }
  const notification = new Notification(native)
  kept.add(notification)
  if (kept.size > MAX_KEPT) kept.delete(kept.values().next().value as Notification)
  const release = (): boolean => kept.delete(notification)
  notification.on('click', () => {
    release()
    onClick()
  })
  notification.on('close', release)
  notification.show()
}

// Bouton « Tester » des réglages : montre une notification dans le style choisi.
export const notifyTest = (): void =>
  notify('test', {
    title: 'Notifications de Photon',
    body:
      data.settings.notifications.style === 'windows'
        ? 'Elles arrivent bien. Windows peut les couper dans Paramètres › Notifications.'
        : 'Elles arrivent bien. Survole une carte pour la garder à l’écran.',
    actions: [{ label: 'Ouvrir Photon', run: () => void showWindow() }]
  })
