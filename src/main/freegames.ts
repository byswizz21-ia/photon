// Jeux offerts (widget Jeux gratuits) : Epic Games par son API publique (ceux de la semaine et de
// la suivante), Steam et GOG par GamerPower (gratuit, sans clé). Lus en fond toutes les 3 h.
import type { FreeGame } from '../shared/api'
import { backgroundFeed } from './feeds'
import { arr, getJson, httpsHref, imageData, obj, str } from './web'

const EVERY_MS = 3 * 60 * 60_000
const EPIC =
  'https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=fr&country=FR&allowCountries=FR'
const GAMERPOWER = 'https://www.gamerpower.com/api/giveaways?type=game&platform='

type Raw = Omit<FreeGame, 'image'> & { imageUrl: string }

// Offres à 0 % du prix (les autres promotions Epic sont des réductions).
function freeOffer(groups: unknown): { start: number; end: number } | null {
  for (const group of arr(groups)) {
    for (const offer of arr(obj(group)['promotionalOffers'])) {
      const o = obj(offer)
      if (obj(o['discountSetting'])['discountPercentage'] !== 0) continue
      const start = Date.parse(str(o['startDate']))
      const end = Date.parse(str(o['endDate']))
      return { start: Number.isNaN(start) ? 0 : start, end }
    }
  }
  return null
}

export function parseEpic(json: unknown): Raw[] {
  const store = obj(obj(obj(obj(json)['data'])['Catalog'])['searchStore'])
  return arr(store['elements']).flatMap((raw): Raw[] => {
    const game = obj(raw)
    const promotions = obj(game['promotions'])
    const now = freeOffer(promotions['promotionalOffers'])
    const next = now ? null : freeOffer(promotions['upcomingPromotionalOffers'])
    const offer = now ?? next
    if (!offer) return []
    const mapping = obj(arr(obj(game['catalogNs'])['mappings'])[0])
    const slug = str(mapping['pageSlug']) || str(game['productSlug']).replace(/\/home$/, '')
    const images = arr(game['keyImages']).map(obj)
    const wide = images.find((i) => i['type'] === 'OfferImageWide') ?? images[0]
    const image = str(wide?.['url'])
    return [
      {
        id: `epic:${str(game['id'])}`,
        title: str(game['title']),
        store: 'Epic Games',
        url: slug ? `https://store.epicgames.com/fr/p/${slug}` : 'https://store.epicgames.com/fr/free-games',
        imageUrl: image ? `${image}?h=180&w=320&resize=1` : '',
        until: Number.isNaN(offer.end) ? null : offer.end,
        upcoming: next !== null
      }
    ]
  })
}

// « Dwarven Realms (Steam) Key Giveaway » → « Dwarven Realms ».
const cleanTitle = (title: string): string =>
  title.replace(/\s*\((?:Steam|GOG)\)/i, '').replace(/\s*(?:Key\s+)?Giveaway$/i, '').trim()

export function parseGamerPower(json: unknown, store: string): Raw[] {
  return arr(json).flatMap((raw): Raw[] => {
    const game = obj(raw)
    if (game['status'] !== 'Active') return []
    const end = Date.parse(str(game['end_date']).replace(' ', 'T'))
    const url = httpsHref(game['open_giveaway_url'])
    return [
      {
        id: `gp:${String(game['id'])}`,
        title: cleanTitle(str(game['title'])),
        store,
        url,
        imageUrl: httpsHref(game['thumbnail']),
        until: Number.isNaN(end) ? null : end,
        upcoming: false
      }
    ]
  })
}

async function load(): Promise<FreeGame[]> {
  const sources = await Promise.allSettled([
    getJson(EPIC).then(parseEpic),
    getJson(`${GAMERPOWER}steam`).then((json) => parseGamerPower(json, 'Steam')),
    getJson(`${GAMERPOWER}gog`).then((json) => parseGamerPower(json, 'GOG'))
  ])
  // GamerPower répond 201 + objet quand une plateforme n'a rien : liste vide, pas une erreur.
  if (sources.every((s) => s.status === 'rejected')) throw new Error('aucune source joignable')
  const games = sources.flatMap((s) => (s.status === 'fulfilled' ? s.value : []))
  return Promise.all(
    games.map(async ({ imageUrl, ...game }) => ({ ...game, image: await imageData(imageUrl) }))
  )
}

const feed = backgroundFeed<FreeGame>({
  type: 'freegames',
  key: () => 'all',
  load,
  every: () => EVERY_MS
})

export const freeGames = (): ReturnType<typeof feed.read> => feed.read({})
