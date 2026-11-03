import { expect, test, vi } from 'vitest'

vi.mock('electron', () => ({ net: {} }))
vi.mock('./data', () => ({ data: { profile: { widgets: [] } } }))
vi.mock('./window', () => ({ isVisible: () => false }))
const { parseEpic, parseGamerPower } = await import('./freegames')

const offer = (start: string, end: string, percent: number) => ({
  promotionalOffers: [
    { startDate: start, endDate: end, discountSetting: { discountPercentage: percent } }
  ]
})

test('Epic : gratuit maintenant, gratuit la semaine suivante, simple réduction ignorée', () => {
  const json = {
    data: {
      Catalog: {
        searchStore: {
          elements: [
            {
              id: '1',
              title: "Sorry We're Closed",
              catalogNs: { mappings: [{ pageSlug: 'sorry-were-closed-724c86' }] },
              keyImages: [{ type: 'OfferImageWide', url: 'https://cdn1.epicgames.com/a.jpg' }],
              promotions: {
                promotionalOffers: [
                  offer('2026-10-29T16:00:00.000Z', '2026-11-05T16:00:00.000Z', 0)
                ]
              }
            },
            {
              id: '2',
              title: 'Flotsam',
              productSlug: 'flotsam/home',
              keyImages: [],
              promotions: {
                promotionalOffers: [],
                upcomingPromotionalOffers: [
                  offer('2026-11-05T16:00:00.000Z', '2026-11-12T16:00:00.000Z', 0)
                ]
              }
            },
            {
              id: '3',
              title: 'LISA',
              keyImages: [],
              promotions: {
                promotionalOffers: [
                  offer('2026-11-01T00:00:00.000Z', '2026-11-10T06:59:00.000Z', 60)
                ]
              }
            },
            { id: '4', title: 'Sans promo', keyImages: [], promotions: null }
          ]
        }
      }
    }
  }
  const games = parseEpic(json)
  expect(games.map((g) => [g.title, g.upcoming])).toEqual([
    ["Sorry We're Closed", false],
    ['Flotsam', true]
  ])
  expect(games[0]).toMatchObject({
    url: 'https://store.epicgames.com/fr/p/sorry-were-closed-724c86',
    imageUrl: 'https://cdn1.epicgames.com/a.jpg?h=180&w=320&resize=1',
    until: Date.parse('2026-11-05T16:00:00.000Z')
  })
  expect(games[1]?.url).toBe('https://store.epicgames.com/fr/p/flotsam')
})

test('GamerPower : titre nettoyé, offres actives seulement, date de fin', () => {
  const games = parseGamerPower(
    [
      {
        id: 3716,
        title: 'Dwarven Realms (Steam) Key Giveaway',
        thumbnail: 'https://www.gamerpower.com/offers/1/x.jpg',
        open_giveaway_url: 'https://www.gamerpower.com/open/dwarven-realms',
        end_date: 'N/A',
        status: 'Active'
      },
      { id: 1, title: 'Old (Steam) Giveaway', status: 'Expired', end_date: '2026-01-01 23:59:00' }
    ],
    'Steam'
  )
  expect(games).toEqual([
    {
      id: 'gp:3716',
      title: 'Dwarven Realms',
      store: 'Steam',
      url: 'https://www.gamerpower.com/open/dwarven-realms',
      imageUrl: 'https://www.gamerpower.com/offers/1/x.jpg',
      until: null,
      upcoming: false
    }
  ])
})
