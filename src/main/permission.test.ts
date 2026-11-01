import { describe, expect, it } from 'vitest'
import { describeAction } from './permission'

describe('describeAction', () => {
  it('montre la commande entière', () => {
    const action = describeAction('PowerShell', { command: 'Remove-Item C:\\x -Recurse' })
    expect(action).toEqual({ title: 'Exécuter une commande', detail: 'Remove-Item C:\\x -Recurse' })
  })

  it('montre le fichier et le texte écrit, coupé au-delà de 4 000 caractères', () => {
    const action = describeAction('Write', { file_path: 'C:\\a.txt', content: 'x'.repeat(5_000) })
    expect(action.detail.startsWith('C:\\a.txt\n\nxxx')).toBe(true)
    expect(action.detail).toContain('caractères de plus')
  })

  it('outil inconnu : ses paramètres bruts', () => {
    expect(describeAction('Task', { a: 1 }).detail).toContain('"a": 1')
  })
})
