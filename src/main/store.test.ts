import { promises as fs } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, test } from 'vitest'
import { readJson, writeJson } from './store'

interface Doc {
  value: number
}

const parse = (raw: unknown): Doc => {
  if (typeof raw !== 'object' || raw === null || typeof (raw as Doc).value !== 'number') {
    throw new Error('invalide')
  }
  return raw as Doc
}
const fallback = (): Doc => ({ value: -1 })

let file: string

beforeEach(async () => {
  const dir = await fs.mkdtemp(join(tmpdir(), 'photon-store-'))
  file = join(dir, 'sub', 'doc.json')
})

const read = (): Promise<Doc> => readJson(file, parse, fallback)
const write = (value: number): Promise<void> => writeJson(file, { value }, parse)
const readBak = async (): Promise<unknown> => JSON.parse(await fs.readFile(`${file}.bak`, 'utf8'))

describe('writeJson', () => {
  test('écrit puis relit les mêmes données, sans laisser de .tmp', async () => {
    await write(1)
    expect(await read()).toEqual({ value: 1 })
    await expect(fs.access(`${file}.tmp`)).rejects.toThrow()
  })

  test('garde la version précédente dans le .bak', async () => {
    await write(1)
    await write(2)
    expect(await readBak()).toEqual({ value: 1 })
  })

  test('ne copie jamais un fichier corrompu dans le .bak', async () => {
    await write(1)
    await write(2) // .bak = 1
    await fs.writeFile(file, '{ cassé', 'utf8')
    await write(3)
    expect(await readBak()).toEqual({ value: 1 })
    expect(await read()).toEqual({ value: 3 })
  })

  test('ne copie pas dans le .bak un JSON lisible mais rejeté par le modèle', async () => {
    await write(1)
    await write(2) // .bak = 1
    await fs.writeFile(file, '[]', 'utf8')
    await write(3)
    expect(await readBak()).toEqual({ value: 1 })
  })

  test('les écritures simultanées passent dans l’ordre : la dernière gagne', async () => {
    await Promise.all([1, 2, 3, 4, 5].map(write))
    expect(await read()).toEqual({ value: 5 })
  })
})

describe('readJson', () => {
  test('fichier absent : valeur par défaut', async () => {
    expect(await read()).toEqual({ value: -1 })
  })

  test('fichier corrompu : reprise du .bak', async () => {
    await write(1)
    await write(2)
    await fs.writeFile(file, '{ cassé', 'utf8')
    expect(await read()).toEqual({ value: 1 })
  })

  test('JSON valide mais contenu invalide : reprise du .bak', async () => {
    await write(1)
    await write(2)
    await fs.writeFile(file, '[]', 'utf8')
    expect(await read()).toEqual({ value: 1 })
  })

  test('fichier et .bak corrompus : valeur par défaut', async () => {
    await write(1)
    await fs.writeFile(file, 'null', 'utf8')
    await fs.writeFile(`${file}.bak`, '', 'utf8')
    expect(await read()).toEqual({ value: -1 })
  })
})
