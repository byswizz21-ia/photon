import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import { expect, test, vi } from 'vitest'

// Faux outil natif : lit le code C# jusqu'à la ligne de fin (native.ts), puis répond à chaque
// commande comme audio.cs, ou se tait si `silent`.
const sent: string[] = []
let spawned = 0
let silent = false
let current = 'a'
const kills: (() => void)[] = []

vi.mock('./system', () => ({ fileIcon: (path: string) => Promise.resolve(`icône de ${path}`) }))

vi.mock('node:child_process', () => ({
  spawn: () => {
    spawned++
    const stdin = new PassThrough()
    const stdout = new PassThrough()
    const proc = Object.assign(new EventEmitter(), { stdin, stdout, kill: () => proc.emit('exit') })
    kills.push(proc.kill)
    let compiled = false
    stdin.on('data', (chunk: Buffer) => {
      for (const line of chunk.toString().split('\n').filter(Boolean)) {
        if (!compiled) {
          compiled = line === '#photon-end-of-source'
          continue
        }
        sent.push(line)
        if (silent) continue
        if (line.startsWith('app')) {
          const apps = [
            { id: 'spotify', name: 'Spotify', volume: 80, muted: false, path: 'C:\\s.exe' }
          ]
          stdout.write(`${JSON.stringify({ apps })}\n`)
          continue
        }
        if (line.startsWith('device ')) current = line.slice(7)
        const devices = [
          { id: 'a', name: 'Casque (USB)' },
          { id: 'b', name: 'Enceintes' }
        ]
        stdout.write(`${JSON.stringify({ volume: 40, muted: false, current, devices })}\n`)
      }
    })
    return proc
  }
}))

const { audio, audioAppIcon, audioApps, audioAppVolume, audioDevice, audioMute, audioVolume } =
  await import('./audio')

test('commandes validées, réponses dans l’ordre', async () => {
  const [first, second] = await Promise.all([audio(), audioVolume(150)])
  expect(first?.devices).toHaveLength(2)
  expect(second?.volume).toBe(40)
  expect(sent).toEqual(['state', 'volume 100'])
  expect(audioVolume(Number.NaN)).toBeNull()
  expect(audioMute('oui')).toBeNull()
  expect(audioDevice('inconnue; Remove-Item')).toBeNull() // pas dans la liste lue
  expect((await audioDevice('b'))?.current).toBe('b')
  expect(spawned).toBe(1) // un seul outil pour toutes les commandes
})

test('outil arrêté : réponse null, relancé à la commande suivante', async () => {
  silent = true
  const pending = audio()
  kills.at(-1)?.()
  expect(await pending).toBeNull()
  silent = false
  expect(await audio()).not.toBeNull()
  expect(spawned).toBe(2)
})

test('volume par app : seulement une app de la liste lue, chemin gardé côté main', async () => {
  expect(audioAppVolume('spotify', 50)).toBeNull() // liste pas encore lue
  expect(await audioApps()).toEqual([{ id: 'spotify', name: 'Spotify', volume: 80, muted: false }])
  expect(audioAppVolume('discord; Remove-Item', 50)).toBeNull()
  expect(audioAppVolume('spotify', Number.NaN)).toBeNull()
  await audioAppVolume('spotify', 120)
  expect(sent.at(-1)).toBe('appvolume spotify 100')
  expect(await audioAppIcon('spotify')).toBe('icône de C:\\s.exe')
  expect(await audioAppIcon('inconnue')).toBeNull()
})
