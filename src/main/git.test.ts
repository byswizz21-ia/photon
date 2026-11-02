import { expect, test, vi } from 'vitest'

vi.mock('electron', () => ({ shell: {} }))
const { parseStatus } = await import('./git')

test('git status : branche, avance/retard, fichiers modifiés et nouveaux', () => {
  const out = [
    '# branch.oid 846b83d',
    '# branch.head main',
    '# branch.upstream origin/main',
    '# branch.ab +3 -1',
    '1 .M N... 100644 100644 100644 a b src/a.ts',
    '2 R. N... 100644 100644 100644 a b R100 new.ts\told.ts',
    'u UU N... 100644 100644 100644 100644 a b c conflit.ts',
    '? notes.txt',
    ''
  ].join('\n')
  expect(parseStatus(out)).toEqual({
    branch: 'main',
    upstream: true,
    ahead: 3,
    behind: 1,
    changed: 3,
    untracked: 1
  })
})

test('git status : sans branche suivie, HEAD détachée, dépôt propre', () => {
  const out = '# branch.oid abc\n# branch.head (detached)\n'
  expect(parseStatus(out)).toMatchObject({
    branch: 'HEAD détachée',
    upstream: false,
    ahead: 0,
    changed: 0
  })
})
