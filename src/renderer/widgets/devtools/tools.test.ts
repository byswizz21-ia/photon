import { expect, test } from 'vitest'
import { base64, json, sha256, time, url } from './tools'

test('Base64 aller-retour avec accents, variante URL, erreur', () => {
  expect(base64('Élève à 20 €', false).text).toBe('w4lsw6h2ZSDDoCAyMCDigqw=')
  expect(base64('w4lsw6h2ZSDDoCAyMCDigqw', true)).toEqual({ ok: true, text: 'Élève à 20 €' })
  expect(base64('-_8', true).ok).toBe(false) // octets qui ne sont pas du texte UTF-8
  expect(base64('pas du base64 !', true).ok).toBe(false)
  const long = 'é'.repeat(200_000)
  expect(base64(base64(long, false).text, true).text).toBe(long)
})

test('URL et JSON', () => {
  expect(url('a b&c=é', false).text).toBe('a%20b%26c%3D%C3%A9')
  expect(url('a+b%20c', true).text).toBe('a b c')
  expect(url('%E0%A4%A', true).ok).toBe(false)
  expect(json('{"a":[1,2]}', false).text).toBe('{\n  "a": [\n    1,\n    2\n  ]\n}')
  expect(json('{ "a" : 1 }', true).text).toBe('{"a":1}')
  expect(json('{a:1}', false).ok).toBe(false)
})

test('horodatage : secondes, millisecondes, date, vide', () => {
  expect(time('1793574155', new Date()).text).toContain('2026-11-01T23:02:35.000Z')
  expect(time('1793574155309', new Date()).text).toContain('2026-11-01T23:02:35.309Z')
  expect(time('2026-11-01T23:02:35Z', new Date()).text).toBe('1793574155 s\n1793574155000 ms')
  expect(time('', new Date(1793574155309)).text.split('\n')[0]).toBe('1793574155')
  expect(time('hier', new Date()).ok).toBe(false)
})

test('SHA-256', async () => {
  expect((await sha256('abc')).text).toBe(
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
  )
})
