// Widget « Micro-entreprise » : chiffre d'affaires encaissé de l'année face au plafond et au seuil
// de TVA, cotisations à mettre de côté et prochaine déclaration URSSAF. Encaissements partagés
// entre profils (data/micro.json).
import BriefcaseIcon from 'phosphor-svelte/lib/BriefcaseIcon'
import type { WidgetManifest } from '../types'
import Micro from './Micro.svelte'
import type { Activity, Period } from './micro'

export type MicroSettings = {
  activity: Activity
  period: Period // rythme de déclaration choisi à l'URSSAF
  rate: number // % de cotisations ; 0 : barème de l'activité
}

const manifest: WidgetManifest<MicroSettings> = {
  name: 'Micro-entreprise',
  icon: BriefcaseIcon,
  size: { w: 4, h: 4, minW: 3, minH: 2 },
  defaults: { activity: 'services', period: 'mois', rate: 0 },
  component: Micro
}

export default manifest
