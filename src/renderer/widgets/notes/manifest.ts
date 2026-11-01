// Widget « Notes » : un bloc-notes, le même dans tous les profils (data/notes.json).
import NoteIcon from 'phosphor-svelte/lib/NoteIcon'
import type { WidgetManifest } from '../types'
import Notes from './Notes.svelte'

export type NotesSettings = Record<string, never>

const manifest: WidgetManifest<NotesSettings> = {
  name: 'Notes',
  icon: NoteIcon,
  size: { w: 3, h: 3, minW: 2, minH: 2 },
  defaults: {},
  component: Notes
}

export default manifest
