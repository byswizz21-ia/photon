// Widget « To-do » : une liste de tâches, la même dans tous les profils (data/todo.json).
import ListChecksIcon from 'phosphor-svelte/lib/ListChecksIcon'
import type { WidgetManifest } from '../types'
import Todo from './Todo.svelte'

export type TodoSettings = Record<string, never>

const manifest: WidgetManifest<TodoSettings> = {
  name: 'To-do',
  icon: ListChecksIcon,
  size: { w: 3, h: 3, minW: 2, minH: 2 },
  defaults: {},
  component: Todo
}

export default manifest
