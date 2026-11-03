// Widget « Budget du mois » : plafond mensuel, dépenses saisies en deux secondes, reste à
// dépenser par jour. Données partagées entre profils (data/budget.json), ou propres au profil.
import WalletIcon from 'phosphor-svelte/lib/WalletIcon'
import type { WidgetManifest } from '../types'
import Budget from './Budget.svelte'

export type BudgetSettings = { own: boolean }

const manifest: WidgetManifest<BudgetSettings> = {
  name: 'Budget du mois',
  category: 'organize',
  description: 'Dépenses du mois par catégorie et reste à dépenser par jour.',
  icon: WalletIcon,
  size: { w: 4, h: 3, minW: 3, minH: 2 },
  defaults: { own: false },
  component: Budget
}

export default manifest
