import { expect, test, vi } from 'vitest'

vi.mock('electron', () => ({}))
vi.mock('../../assets/icon.ico?asset', () => ({ default: '' }))
vi.mock('./feeds', () => ({ backgroundFeed: () => ({}), FeedError: Error }))
const { parseChannels, parseUser } = await import('./twitch')

test('pseudos : minuscules, adresses twitch.tv, doublons et invalides retirés', () => {
  expect(parseChannels('ZeratoR, https://www.twitch.tv/Kamet0/videos ; squeezie\nzerator')).toEqual(
    ['zerator', 'kamet0', 'squeezie']
  )
  expect(parseChannels('pas-valide, ok_1')).toEqual(['ok_1'])
  expect(parseChannels(42)).toEqual([])
})

test('utilisateur GraphQL : live lu, hors ligne ignoré', () => {
  const user = {
    login: 'caedrel',
    displayName: 'Caedrel',
    profileImageURL: 'https://static-cdn.jtvnw.net/a.png',
    stream: {
      title: 'Worlds',
      viewersCount: 51149,
      createdAt: '2026-11-03T16:04:43Z',
      game: { displayName: 'League of Legends' },
      previewImageURL: 'https://static-cdn.jtvnw.net/p.jpg'
    }
  }
  expect(parseUser(user)).toEqual({
    login: 'caedrel',
    name: 'Caedrel',
    title: 'Worlds',
    game: 'League of Legends',
    viewers: 51149,
    since: Date.UTC(2026, 10, 3, 16, 4, 43),
    avatarUrl: 'https://static-cdn.jtvnw.net/a.png',
    previewUrl: 'https://static-cdn.jtvnw.net/p.jpg'
  })
  expect(parseUser({ ...user, stream: null })).toBeNull()
  expect(parseUser({ ...user, login: '../x' })).toBeNull()
})
