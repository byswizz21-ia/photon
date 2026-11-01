// Données partagées entre profils (notes, to-do…) : un JSON par clé dans data/. Chaque widget
// valide ce qu'il relit ; ici on borne seulement la clé (nom de fichier) et la taille.
import { app } from 'electron'
import { join } from 'node:path'
import { isName } from '../shared/model'
import { readJson, writeJson } from './store'

const MAX_CHARS = 1_000_000

const cache = new Map<string, unknown>()
const file = (key: string): string => join(app.getPath('userData'), 'data', `${key}.json`)

// Tout JSON est accepté (le widget le valide) ; un fichier vide ou corrompu passe au .bak.
const anyJson = (raw: unknown): unknown => {
  if (raw === null || raw === undefined) throw new Error('vide')
  return raw
}

export async function sharedLoad(key: unknown): Promise<unknown> {
  if (!isName(key)) return null
  if (!cache.has(key)) cache.set(key, await readJson(file(key), anyJson, () => null))
  return cache.get(key)
}

export async function sharedSave(key: unknown, value: unknown): Promise<void> {
  if (!isName(key) || value == null || JSON.stringify(value).length > MAX_CHARS) return
  cache.set(key, value)
  await writeJson(file(key), value, anyJson)
}
