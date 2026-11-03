import { expect, test, vi } from 'vitest'

vi.mock('electron', () => ({ net: {} }))
const widgets: { type: string; settings: Record<string, unknown> }[] = []
vi.mock('./data', () => ({ data: { profile: { widgets } } }))
const { parseChart, parseSymbols, watchedSymbols } = await import('./markets')

test('symboles lus en fond : ceux du widget, ou ceux par défaut si jamais réglé', () => {
  widgets.push(
    { type: 'markets', settings: {} },
    { type: 'markets', settings: { symbols: 'aapl' } }
  )
  expect(watchedSymbols()).toEqual(['BTC-EUR', 'ETH-EUR', 'AAPL'])
  widgets.length = 0
})

test('symboles : majuscules, doublons et entrées invalides retirés', () => {
  expect(parseSymbols('btc-eur, AAPL;^fchi  btc-eur ../x mc.pa')).toEqual([
    'BTC-EUR',
    'AAPL',
    '^FCHI',
    'MC.PA'
  ])
  expect(parseSymbols(42)).toEqual([])
})

test('réponse Yahoo : prix, veille, séance, courbe sans trous', () => {
  const json = {
    chart: {
      result: [
        {
          meta: {
            regularMarketPrice: 401.5,
            chartPreviousClose: 393.65,
            regularMarketTime: 1793723928,
            currency: 'EUR',
            shortName: 'LVMH',
            instrumentType: 'EQUITY',
            fullExchangeName: 'Paris',
            currentTradingPeriod: {
              regular: { start: 1793692800, end: 1793723400, gmtoffset: 3600 }
            }
          },
          timestamp: [1793692800, 1793693100, 1793693400, 1793693700],
          indicators: { quote: [{ close: [393.1, null, 394, 401.5] }] }
        }
      ]
    }
  }
  expect(parseChart('MC.PA', json)).toEqual({
    symbol: 'MC.PA',
    name: 'LVMH',
    price: 401.5,
    previous: 393.65,
    currency: 'EUR',
    time: 1793723928000,
    kind: 'stock',
    exchange: 'Paris',
    session: { start: 1793692800000, end: 1793723400000, offset: 3600000 },
    history: {},
    points: [393.1, 394, 401.5],
    times: [1793692800000, 1793693400000, 1793693700000]
  })
  const crypto = parseChart('BTC-EUR', {
    chart: {
      result: [
        {
          meta: {
            regularMarketPrice: 1,
            chartPreviousClose: 1,
            shortName: 'Bitcoin EUR',
            instrumentType: 'CRYPTOCURRENCY'
          }
        }
      ]
    }
  })
  expect(crypto).toMatchObject({ name: 'Bitcoin', kind: 'crypto', session: null, points: [] })
  const apple = parseChart('AAPL', {
    chart: {
      result: [
        {
          meta: {
            regularMarketPrice: 1,
            chartPreviousClose: 1,
            shortName: 'Apple Inc.'
          }
        }
      ]
    }
  })
  expect(apple?.name).toBe('Apple')
  expect(parseChart('X', { chart: { result: null, error: { code: 'Not Found' } } })).toBeNull()
})

test('historique : seulement les widgets en design détaillé', () => {
  widgets.push(
    { type: 'markets', settings: { symbols: 'aapl' } },
    { type: 'markets', settings: { symbols: 'nvda, aapl', design: 'spot' } },
    { type: 'markets', settings: { symbols: 'mc.pa', design: 'market' } }
  )
  expect(watchedSymbols(true)).toEqual(['NVDA', 'AAPL', 'MC.PA'])
  widgets.length = 0
})
