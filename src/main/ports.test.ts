import { expect, test } from 'vitest'
import { parseNetstat } from './ports'

test('ports en écoute : IPv4 et IPv6 fusionnés, local ou réseau, le reste ignoré', () => {
  const text = [
    'Connexions actives',
    '  Proto  Adresse locale         Adresse distante       État',
    '  TCP    0.0.0.0:135            0.0.0.0:0              LISTENING       1464',
    '  TCP    127.0.0.1:5173         0.0.0.0:0              LISTENING       9000',
    '  TCP    192.168.1.20:52001     142.250.1.1:443        ESTABLISHED     700',
    '  TCP    [::]:135               [::]:0                 LISTENING       1464',
    '  TCP    [::1]:5173             [::]:0                 LISTENING       9000',
    '  TCP    [::]:3000              [::]:0                 LISTENING       9100',
    '  UDP    0.0.0.0:5353           *:*                                    2000'
  ].join('\r\n')
  expect(parseNetstat(text)).toEqual([
    { port: 135, pid: 1464, local: false },
    { port: 3000, pid: 9100, local: false },
    { port: 5173, pid: 9000, local: true }
  ])
})
