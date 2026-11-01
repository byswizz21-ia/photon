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

test('réponse Yahoo : prix, veille, courbe sans trous', () => {
  const json = {
    chart: {
      result: [
        {
          meta: {
            regularMarketPrice: 69713.7,
            chartPreviousClose: 69146.8,
            currency: 'EUR',
            shortName: 'Bitcoin EUR'
          },
          indicators: { quote: [{ close: [69100, null, 69500, 69713.7] }] }
        }
      ]
    }
  }
  expect(parseChart('BTC-EUR', json)).toEqual({
    symbol: 'BTC-EUR',
    name: 'Bitcoin',
    price: 69713.7,
    previous: 69146.8,
    currency: 'EUR',
    points: [69100, 69500, 69713.7]
  })
  expect(parseChart('X', { chart: { result: null, error: { code: 'Not Found' } } })).toBeNull()
})
