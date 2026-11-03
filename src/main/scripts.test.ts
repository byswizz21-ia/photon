import { expect, test } from 'vitest'
import { decode } from './scripts'

test('sortie UTF-8 gardée, sortie OEM 850 (ping, dir) relue', () => {
  expect(decode(Buffer.from('Prêt ✓', 'utf8'))).toBe('Prêt ✓')
  // « Réponse de » en page 850 : é = 0x82
  expect(decode(Buffer.from([0x52, 0x82, 0x70, 0x6f, 0x6e, 0x73, 0x65]))).toBe('Réponse')
})
