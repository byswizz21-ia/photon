import { expect, test, vi } from 'vitest'

vi.mock('electron', () => ({ shell: {} }))
const { filterOverrides, parseStatus } = await import('./git')

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

test('filtres du dépôt coupés, sauf Git LFS', () => {
  const out = [
    'filter.lfs.clean git-lfs clean -- %f',
    'filter.lfs.process git-lfs filter-process',
    'filter.evil.clean C:/temp/evil.exe %f',
    'filter.evil.required true',
    ''
  ].join('\n')
  expect(filterOverrides(out)).toEqual([
    '-c',
    'filter.evil.clean=',
    '-c',
    'filter.evil.required=false'
  ])
})
