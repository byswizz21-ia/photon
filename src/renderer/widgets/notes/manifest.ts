// Widget « Notes » : chaque carte affiche sa propre note, tirée du carnet commun à tous les
// profils (data/notes.json, voir notebook.ts). La liste du carnet permet d'en changer.
import NoteIcon from 'phosphor-svelte/lib/NoteIcon'
import type { WidgetManifest } from '../types'
import Notes from './Notes.svelte'

export const NOTE_SIZES = [
  ['s', 'Petit'],
  ['m', 'Moyen'],
  ['l', 'Grand']
] as const
export const NOTE_FONTS = [
  ['sans', 'Sans'],
  ['serif', 'Serif'],
  ['mono', 'Mono']
] as const

export type NotesSettings = {
  note: string // id de la note affichée, '' : la carte s'en crée une
  size: string
  font: string
  footer: boolean // mots et date de modification en bas
  spell: boolean // correcteur orthographique
  // Ancien réglage « propre au profil » (data/notes-<profil>.json) : sa note est reprise dans le
  // carnet à la première ouverture, puis il ne sert plus.
  own: boolean
}

const manifest: WidgetManifest<NotesSettings> = {
  name: 'Notes',
  category: 'organize',
  description: 'Bloc-notes : une note par carte, toutes rangées dans un carnet.',
  icon: NoteIcon,
  size: { w: 3, h: 3, minW: 2, minH: 2 },
  defaults: { note: '', size: 'm', font: 'sans', footer: true, spell: true, own: false },
  component: Notes
}

export default manifest
