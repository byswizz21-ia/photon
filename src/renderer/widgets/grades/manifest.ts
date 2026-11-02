// Widget « Moyenne » : notes et coefficients d'une matière (un widget par matière), moyenne sur 20
// et note à viser au prochain contrôle pour atteindre son objectif.
import GraduationCapIcon from 'phosphor-svelte/lib/GraduationCapIcon'
import type { WidgetManifest } from '../types'
import Grades from './Grades.svelte'
import type { Grade } from './grades'

export type GradesSettings = { title: string; target: number; grades: Grade[] }

const manifest: WidgetManifest<GradesSettings> = {
  name: 'Moyenne',
  icon: GraduationCapIcon,
  size: { w: 3, h: 3, minW: 2, minH: 1 },
  defaults: { title: '', target: 12, grades: [] },
  component: Grades
}

export default manifest
