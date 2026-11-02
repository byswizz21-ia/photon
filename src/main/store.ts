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

// `parse` valide l'ancienne version avant d'en faire la copie de secours.
export function writeJson<T>(file: string, data: T, parse: (raw: unknown) => T): Promise<void> {
  const run = (): Promise<void> => write(file, JSON.stringify(data, null, 2), parse)
  const next = (queues.get(file) ?? Promise.resolve()).then(run, run)
  queues.set(file, next)
  return next
}

// Toutes les écritures en cours (avant de quitter Photon).
export const allWrites = (): Promise<unknown> =>
  Promise.all([...queues.values()].map((write) => write.catch(() => undefined)))

// Attend la fin des écritures en cours d'un fichier (avant de le déplacer).
export const pending = (file: string): Promise<void> =>
  (queues.get(file) ?? Promise.resolve()).catch(() => undefined)

async function write(file: string, json: string, parse: (raw: unknown) => unknown): Promise<void> {
  await fs.mkdir(dirname(file), { recursive: true })
  const tmp = `${file}.tmp`
  const handle = await fs.open(tmp, 'w')
  try {
    await handle.writeFile(json, 'utf8')
    await handle.sync()
  } finally {
    await handle.close()
  }
  await backup(file, parse)
  await renameWithRetry(tmp, file)
}

// Le .bak garde la dernière version valide : jamais un fichier corrompu ou rejeté par le modèle.
// Copie « au mieux » : un .bak verrouillé ne doit pas faire échouer la sauvegarde.
async function backup(file: string, parse: (raw: unknown) => unknown): Promise<void> {
  try {
    const current = await fs.readFile(file, 'utf8')
    parse(JSON.parse(current))
    await fs.writeFile(`${file}.bak`, current, 'utf8')
  } catch {
    // pas d'ancienne version valide, ou .bak indisponible : on garde l'ancien .bak
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
