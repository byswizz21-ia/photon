import { describe, expect, it } from 'vitest'
import { continueList, noteName, parseNotebook, wordCount } from './notebook'

// Applique la réponse de continueList au texte, comme le fait la frappe.
function enter(text: string): string | null {
  const edit = continueList(text, text.length)
  return edit && text.slice(0, edit.from) + edit.insert + text.slice(edit.to)
}

describe('parseNotebook', () => {
  it("relit l'ancien format comme la note « main »", () => {
    expect(parseNotebook({ text: 'courses' })).toEqual({
      notes: [{ id: 'main', title: '', text: 'courses', updated: 0 }]
    })
    expect(parseNotebook({ text: '' })).toEqual({ notes: [] })
    expect(parseNotebook(null)).toEqual({ notes: [] })
  })

  it('écarte les notes invalides et les doublons', () => {
    const book = parseNotebook({
      notes: [{ id: 'a', text: 'x' }, { text: 'sans id' }, { id: 'a', text: 'doublon' }, 4]
    })
    expect(book.notes).toEqual([{ id: 'a', title: '', text: 'x', updated: 0 }])
  })
})

describe('noteName', () => {
  const note = { id: 'a', title: '', text: '', updated: 0 }
  it('titre, sinon première ligne, sinon « Sans titre »', () => {
    expect(noteName({ ...note, title: ' Idées ', text: 'x' })).toBe('Idées')
    expect(noteName({ ...note, text: '\n Liste de courses\nlait' })).toBe('Liste de courses')
    expect(noteName(note)).toBe('Sans titre')
  })
})

describe('continueList', () => {
  it('continue les puces, numéros et cases', () => {
    expect(enter('- lait')).toBe('- lait\n- ')
    expect(enter('  * œufs')).toBe('  * œufs\n  * ')
    expect(enter('9. neuf')).toBe('9. neuf\n10. ')
    expect(enter('- [x] fait')).toBe('- [x] fait\n- [ ] ')
    expect(enter('[ ] tâche')).toBe('[ ] tâche\n[ ] ')
  })

  it('retire une puce vide', () => {
    expect(enter('- lait\n- ')).toBe('- lait\n')
    expect(enter('1. ')).toBe('')
  })

  it('laisse le texte normal tranquille', () => {
    expect(enter('bonjour')).toBeNull()
    expect(enter('-5 degrés')).toBeNull()
    expect(enter('3.14')).toBeNull()
  })
})

it('wordCount', () => {
  expect(wordCount('  un deux\ntrois ')).toBe(3)
  expect(wordCount('')).toBe(0)
})
