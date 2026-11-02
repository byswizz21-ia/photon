import { expect, test, vi } from 'vitest'

vi.mock('./system', () => ({ fileIcon: vi.fn() }))
vi.mock('./native', () => ({ nativeTool: () => ({ send: vi.fn(), start: vi.fn() }) }))
const { closable, groups, parseList } = await import('./processes')

test('liste native : lignes valides gardées, le reste ignoré', () => {
  const snap = parseList('[[10,"chrome",1000,500],[11,"x"],"oups",[12,"lsass",-1,20]]', 5)
  expect(snap?.at).toBe(5)
  expect([...(snap?.procs.keys() ?? [])]).toEqual([10, 12])
  expect(parseList('pas du json', 0)).toBeNull()
  expect(parseList(null, 0)).toBeNull()
})

test('groupes : CPU sur tous les cœurs, RAM additionnée, processus nouveaux sans CPU', () => {
  const before = parseList('[[1,"chrome",1000,100],[2,"chrome",500,100],[3,"game",0,50]]', 0)!
  // 1 s plus tard, 4 cœurs : 4000 ms de temps CPU possibles.
  const after = parseList(
    '[[1,"chrome",1400,150],[2,"chrome",900,100],[3,"game",2000,50],[4,"chrome",99999,10]]',
    1000
  )!
  const byName = Object.fromEntries(groups(before, after, 4).map((g) => [g.name, g]))
  expect(byName['chrome']).toMatchObject({ count: 3, cpu: 20, memory: 260, closable: true })
  expect(byName['game']?.cpu).toBe(50)
})

test('pid réutilisé par un autre programme : pas de CPU', () => {
  const before = parseList('[[1,"old",1000,0]]', 0)!
  const after = parseList('[[1,"new",5000,0]]', 1000)!
  expect(groups(before, after, 1).every((g) => g.cpu === 0)).toBe(true)
})

test('Windows et Photon jamais fermables', () => {
  expect(closable('svchost')).toBe(false)
  expect(closable('Photon')).toBe(false)
  expect(closable('EXPLORER')).toBe(false)
  expect(closable('vmmemWSL')).toBe(false)
  expect(closable('chrome')).toBe(true)
})
