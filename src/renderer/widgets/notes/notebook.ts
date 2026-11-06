// Carnet du widget Notes (data/notes.json) : toutes les notes, chaque carte en affiche une.
// Ancien format { text } (une seule note) : relu comme la note « main ».

export interface Note {
  id: string
  title: string
  text: string
  updated: number // ms, 0 : inconnu
}

export interface Notebook {
  notes: Note[]
}

export const LEGACY_ID = 'main'
export const MAX_CHARS = 100_000 // par note
export const MAX_TITLE = 80
export const MAX_NOTES = 60
// ponytail: tout le carnet tient dans un fichier (borné à 1 M de caractères par le processus
// principal) ; au-delà, un fichier par note.
export const BUDGET = 600_000

const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.slice(0, max) : '')

function parseNote(v: unknown): Note | null {
  const n = v as Partial<Note> | null
  if (typeof n?.id !== 'string' || !n.id) return null
  return {
    id: n.id,
    title: str(n.title, MAX_TITLE),
    text: str(n.text, MAX_CHARS),
    updated: typeof n.updated === 'number' && Number.isFinite(n.updated) ? n.updated : 0
  }
}

export function parseNotebook(raw: unknown): Notebook {
  const v = raw as { notes?: unknown; text?: unknown } | null
  if (Array.isArray(v?.notes)) {
    const notes = v.notes.map(parseNote).filter((n) => n !== null)
    return { notes: notes.filter((n, i) => notes.findIndex((o) => o.id === n.id) === i) }
  }
  const text = str(v?.text, MAX_CHARS)
  return { notes: text ? [{ id: LEGACY_ID, title: '', text, updated: 0 }] : [] }
}

// Nom affiché : le titre, sinon la première ligne du texte.
export function noteName(note: Note): string {
  return note.title.trim() || note.text.trim().split('\n')[0]?.slice(0, MAX_TITLE) || 'Sans titre'
}

export const wordCount = (text: string): number => text.match(/\S+/g)?.length ?? 0

export const usedChars = (book: Notebook): number =>
  book.notes.reduce((sum, n) => sum + n.text.length + n.title.length, 0)

// Liste à puces : Entrée sur « - truc » ouvre « - » ; Entrée sur une puce vide la retire.
// Puces reconnues : -, *, •, 1. (numéro suivant), [ ] et [x] (case vide à la suite).
// Rend le morceau à remplacer (from..to) par insert, null : Entrée normale.
const BULLET = /^(\s*)([-*•]|\d+[.)])?(\s*)(\[[ xX]\]\s?)?/

export function continueList(
  text: string,
  caret: number
): { from: number; to: number; insert: string } | null {
  const start = text.lastIndexOf('\n', caret - 1) + 1
  const end = text.indexOf('\n', caret)
  const line = text.slice(start, caret)
  const rest = text.slice(caret, end === -1 ? text.length : end)
  const [prefix = '', indent = '', mark, space = '', box] = BULLET.exec(line) ?? []
  if (!mark && !box) return null
  if (mark && !space && !box) return null // « -5 » ou « 3.14 » : pas une puce
  if (line.trim() === prefix.trim() && !rest.trim()) return { from: start, to: caret, insert: '' }
  const number = mark ? /^(\d+)([.)])$/.exec(mark) : null
  const next = number ? `${Number(number[1]) + 1}${number[2]}` : (mark ?? '')
  return { from: caret, to: caret, insert: `\n${indent}${next}${space}${box ? '[ ] ' : ''}` }
}
