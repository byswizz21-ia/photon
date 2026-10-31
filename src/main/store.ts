// Lecture et écriture sûres des fichiers JSON : écriture atomique + copie de secours .bak.
import { promises as fs } from 'node:fs'
import { dirname } from 'node:path'

// Lit un JSON : fichier principal, sinon sa copie .bak, sinon la valeur par défaut.
export async function readJson<T>(
  file: string,
  parse: (raw: unknown) => T,
  fallback: () => T
): Promise<T> {
  for (const path of [file, `${file}.bak`]) {
    try {
      return parse(JSON.parse(await fs.readFile(path, 'utf8')))
    } catch {
      // absent ou corrompu : on essaie la copie suivante
    }
  }
  return fallback()
}

// Les écritures d'un même fichier passent l'une après l'autre (pas de course sur le .tmp).
const queues = new Map<string, Promise<void>>()

export function writeJson(file: string, data: unknown): Promise<void> {
  const run = (): Promise<void> => write(file, JSON.stringify(data, null, 2))
  const next = (queues.get(file) ?? Promise.resolve()).then(run, run)
  queues.set(file, next)
  return next
}

async function write(file: string, json: string): Promise<void> {
  await fs.mkdir(dirname(file), { recursive: true })
  const tmp = `${file}.tmp`
  const handle = await fs.open(tmp, 'w')
  try {
    await handle.writeFile(json, 'utf8')
    await handle.sync()
  } finally {
    await handle.close()
  }
  // Le .bak garde la dernière version lisible : on n'y copie jamais un fichier corrompu.
  if (await isValidJson(file)) await fs.copyFile(file, `${file}.bak`)
  await renameWithRetry(tmp, file)
}

async function isValidJson(file: string): Promise<boolean> {
  try {
    JSON.parse(await fs.readFile(file, 'utf8'))
    return true
  } catch {
    return false
  }
}

// Sous Windows, un antivirus ou l'indexeur peut verrouiller le fichier quelques millisecondes.
async function renameWithRetry(from: string, to: string): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fs.rename(from, to)
    } catch (error) {
      if (attempt >= 5) throw error
      await new Promise((resolve) => setTimeout(resolve, 40 * attempt))
    }
  }
}
