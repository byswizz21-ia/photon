// Notifications Windows de Photon : toutes passent ici. Chaque source se coupe dans Réglages ›
// Notifications ; 'always' (avertissement avant un arrêt du PC) part quoi qu'il arrive.
// Chaque notification est gardée en mémoire : libérée par le ramasse-miettes, son clic ne ferait
// plus rien. Clic par défaut : Photon s'ouvre.
import { Notification, type NotificationConstructorOptions } from 'electron'
import type { NotifySource } from '../shared/model'
import { data } from './data'
import { showWindow } from './window'

const MAX_KEPT = 20 // celles restées dans le centre de notifications : les plus anciennes partent
const kept = new Set<Notification>()

export const notifyAllowed = (source: NotifySource | 'always'): boolean => {
  const { enabled, sources } = data.settings.notifications
  return source === 'always' || (enabled && sources[source] !== false)
}

export function notify(
  source: NotifySource | 'always',
  options: NotificationConstructorOptions,
  onClick: () => void = () => void showWindow()
): void {
  if (!notifyAllowed(source) || !Notification.isSupported()) return
  const notification = new Notification(options)
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

// Bouton « Tester » des réglages : vérifie que Windows laisse passer les notifications de Photon.
export const notifyTest = (): void =>
  notify('always', {
    title: 'Notifications de Photon',
    body: 'Elles arrivent bien. Windows peut les couper dans Paramètres › Notifications.',
    silent: true
  })
