// Widget « To-do » : une liste de tâches, la même dans tous les profils (data/todo.json), ou
// propre au profil (réglage own : data/todo-<profil>.json).
import ListChecksIcon from 'phosphor-svelte/lib/ListChecksIcon'
import type { WidgetManifest } from '../types'
import Todo from './Todo.svelte'

export type TodoSettings = { own: boolean }

const manifest: WidgetManifest<TodoSettings> = {
  name: 'To-do',
  category: 'organize',
  description: 'Liste de tâches à cocher.',
  icon: ListChecksIcon,
  size: { w: 3, h: 3, minW: 2, minH: 2 },
  defaults: { own: false },
  component: Todo
}

export default manifest
