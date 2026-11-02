// Widgets rangés pour le menu « Ajouter » et le catalogue : par rubrique puis par nom, ou résultats
// d'une recherche (nom, description, rubrique ; sans accents ni casse), le nom qui colle d'abord.
import { CATEGORIES, type WidgetCategory, type WidgetManifest } from './types'

export interface WidgetEntry {
  type: string
  manifest: WidgetManifest
}

export interface WidgetGroup {
  category: WidgetCategory
  label: string
  entries: WidgetEntry[]
}

const simple = (text: string): string => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

const byName = (a: WidgetEntry, b: WidgetEntry): number =>
  a.manifest.name.localeCompare(b.manifest.name, 'fr')

const entriesOf = (all: Record<string, WidgetManifest>): WidgetEntry[] =>
  Object.entries(all).map(([type, manifest]) => ({ type, manifest }))

export function groupWidgets(all: Record<string, WidgetManifest>): WidgetGroup[] {
  const entries = entriesOf(all).sort(byName)
  return (Object.keys(CATEGORIES) as WidgetCategory[])
    .map((category) => ({
      category,
      label: CATEGORIES[category],
      entries: entries.filter((entry) => entry.manifest.category === category)
    }))
    .filter((group) => group.entries.length > 0)
}

export function searchWidgets(all: Record<string, WidgetManifest>, query: string): WidgetEntry[] {
  const q = simple(query.trim())
  if (!q) return []
  const inName = (entry: WidgetEntry): boolean => simple(entry.manifest.name).includes(q)
  return entriesOf(all)
    .filter((entry) => {
      const { name, description, category } = entry.manifest
      return simple(`${name} ${description} ${CATEGORIES[category]}`).includes(q)
    })
    .sort((a, b) => Number(inName(b)) - Number(inName(a)) || byName(a, b))
}
