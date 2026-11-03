// Widget « Anniversaires » : prochains anniversaires, âge atteint, rappel la veille et le jour J
// (Réglages › Notifications). Données partagées entre profils : data/birthdays.json.
import CakeIcon from 'phosphor-svelte/lib/CakeIcon'
import type { WidgetManifest } from '../types'
import Birthdays from './Birthdays.svelte'

export type BirthdaysSettings = Record<string, never>

const manifest: WidgetManifest<BirthdaysSettings> = {
  name: 'Anniversaires',
  category: 'organize',
  description: 'Prochains anniversaires, avec un rappel la veille et le jour J.',
  icon: CakeIcon,
  size: { w: 3, h: 3, minW: 2, minH: 2 },
  defaults: {},
  component: Birthdays
}

export default manifest
