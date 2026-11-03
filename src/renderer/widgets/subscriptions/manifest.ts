// Widget « Abonnements » : coût par mois et par an, prochain prélèvement de chacun, rappel la
// veille (Réglages › Notifications). Données partagées entre profils : data/subscriptions.json.
import ReceiptIcon from 'phosphor-svelte/lib/ReceiptIcon'
import type { WidgetManifest } from '../types'
import Subscriptions from './Subscriptions.svelte'

export type SubscriptionsSettings = Record<string, never>

const manifest: WidgetManifest<SubscriptionsSettings> = {
  name: 'Abonnements',
  category: 'organize',
  description: 'Ce que coûtent tes abonnements et le prochain prélèvement de chacun.',
  icon: ReceiptIcon,
  size: { w: 4, h: 3, minW: 3, minH: 2 },
  defaults: {},
  component: Subscriptions
}

export default manifest
