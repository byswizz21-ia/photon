// Notifications Windows de Photon. Chaque notification est gardée en mémoire : libérée par le
// ramasse-miettes, son clic ne ferait plus rien (Photon ne se rouvrirait pas).
import { Notification, type NotificationConstructorOptions } from 'electron'

const MAX_KEPT = 20 // celles restées dans le centre de notifications : les plus anciennes partent
const kept = new Set<Notification>()

export function notify(options: NotificationConstructorOptions, onClick?: () => void): void {
  if (!Notification.isSupported()) return
  const notification = new Notification(options)
  kept.add(notification)
  if (kept.size > MAX_KEPT) kept.delete(kept.values().next().value as Notification)
  const release = (): boolean => kept.delete(notification)
  notification.on('click', () => {
    release()
    onClick?.()
  })
  notification.on('close', release)
  notification.show()
}
