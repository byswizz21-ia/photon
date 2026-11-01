import { expect, test, vi } from 'vitest'

vi.mock('electron', () => ({ net: {} }))
vi.mock('./data', () => ({ data: { profile: { widgets: [] } } }))
const { parseChart, parseSymbols } = await import('./markets')

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
