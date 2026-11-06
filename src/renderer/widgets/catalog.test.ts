import { expect, test } from 'vitest'
import { favoriteWidgets, groupWidgets, searchWidgets } from './catalog'
import type { WidgetCategory, WidgetManifest } from './types'

const widget = (name: string, category: WidgetCategory, description = ''): WidgetManifest =>
  ({ name, category, description }) as WidgetManifest

const all = {
  volume: widget('Son', 'media', 'Volume de Windows'),
  clock: widget('Horloge', 'time', 'Heure en grand'),
  todo: widget('To-do', 'organize', 'Liste de tâches'),
  agenda: widget('Agenda', 'time', 'Prochains événements')
}

test('catalogue : rubriques dans l’ordre, noms triés, rubrique vide absente', () => {
  expect(groupWidgets(all).map((g) => [g.label, g.entries.map((e) => e.type)])).toEqual([
    ['Temps', ['agenda', 'clock']],
    ['Organisation', ['todo']],
    ['Musique et médias', ['volume']]
  ])
})

test('recherche : sans accents, nom avant description, rubrique trouvée', () => {
  expect(searchWidgets(all, 'TACHES').map((e) => e.type)).toEqual(['todo'])
  expect(searchWidgets(all, 'ag').map((e) => e.type)).toEqual(['agenda'])
  expect(searchWidgets(all, 'heure').map((e) => e.type)).toEqual(['clock'])
  expect(searchWidgets(all, 'musique').map((e) => e.type)).toEqual(['volume'])
  expect(searchWidgets(all, 'o').map((e) => e.type)).toEqual(['clock', 'volume', 'todo', 'agenda'])
  expect(searchWidgets(all, '  ')).toEqual([])
})

test('favoris : triés par nom, type inconnu ignoré', () => {
  expect(favoriteWidgets(all, ['volume', 'old', 'agenda']).map((e) => e.type)).toEqual([
    'agenda',
    'volume'
  ])
  expect(favoriteWidgets(all, [])).toEqual([])
})
