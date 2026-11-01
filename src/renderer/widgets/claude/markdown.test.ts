import { describe, expect, it } from 'vitest'
import { inline, parseMarkdown } from './markdown'

describe('parseMarkdown', () => {
  it('découpe titres, listes, paragraphes et code', () => {
    const blocks = parseMarkdown(
      '# Titre\n\nUn **mot** et `x`.\n\n- a\n- b\n1. un\n\n```ts\nconst a = 1\n```'
    )
    expect(blocks.map((b) => b.kind)).toEqual(['heading', 'paragraph', 'list', 'list', 'code'])
    expect(blocks[4]).toEqual({ kind: 'code', lang: 'ts', text: 'const a = 1' })
  })

  it('traite un bloc de code pas encore fermé comme du code (réponse en cours)', () => {
    expect(parseMarkdown('Voici :\n```\nligne 1')).toEqual([
      { kind: 'paragraph', inline: [{ kind: 'text', text: 'Voici :' }] },
      { kind: 'code', lang: '', text: 'ligne 1' }
    ])
  })

  it('garde le HTML comme du texte', () => {
    expect(inline('<img src=x onerror=alert(1)> **gras** `<b>`')).toEqual([
      { kind: 'text', text: '<img src=x onerror=alert(1)> ' },
      { kind: 'bold', text: 'gras' },
      { kind: 'text', text: ' ' },
      { kind: 'code', text: '<b>' }
    ])
  })
})
