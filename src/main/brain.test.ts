import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ app: { getPath: () => '' } }))
const { readResult } = await import('./brain')

describe('readResult', () => {
  it('garde la sortie structurée', () => {
    const out = JSON.stringify({ is_error: false, structured_output: { cards: [] } })
    expect(readResult(out)).toEqual({ value: { cards: [] }, error: null })
  })

  it('remonte les erreurs de Claude Code', () => {
    expect(readResult(JSON.stringify({ is_error: true, result: 'Quota atteint' }))).toEqual({
      value: null,
      error: 'Quota atteint'
    })
    expect(readResult('pas du json').error).toBe('Réponse illisible de Claude Code')
    expect(readResult(JSON.stringify({ result: 'texte' })).error).toBe(
      'Réponse sans contenu structuré'
    )
  })
})
