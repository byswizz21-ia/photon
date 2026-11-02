// Widget « Notes » : un bloc-notes, le même dans tous les profils (data/notes.json), ou propre
// au profil (réglage own : data/notes-<profil>.json).
import NoteIcon from 'phosphor-svelte/lib/NoteIcon'
import type { WidgetManifest } from '../types'
import Notes from './Notes.svelte'

export type NotesSettings = { own: boolean }

const manifest: WidgetManifest<NotesSettings> = {
  name: 'Notes',
  category: 'organize',
  description: 'Bloc-notes toujours sous la main.',
  icon: NoteIcon,
  size: { w: 3, h: 3, minW: 2, minH: 1 },
  defaults: { own: false },
  component: Notes
}

export default manifest
