// Captures d'écran récentes (widget Captures) : les dernières images d'un dossier, en miniature,
// à glisser dans une autre app, copier ou mettre à la corbeille. Seuls les fichiers de la
// dernière lecture sont acceptés pour ces actions.
import { app, clipboard, ClipboardItem, nativeImage, shell, type WebContents } from 'electron'
import { readdir, stat } from 'node:fs/promises'
import { extname, isAbsolute, join } from 'node:path'
import type { Screenshot } from '../shared/api'

const MAX_SHOTS = 12
const THUMB = { width: 360, height: 220 }
const EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp'])

// Dernière liste de chaque dossier (deux widgets peuvent suivre deux dossiers). Dossier inchangé
// (sa date bouge à chaque fichier ajouté ou retiré) : liste précédente.
const lists = new Map<string, { changed: number; shots: Screenshot[] }>()
const listed = (path: unknown): path is string =>
  typeof path === 'string' && [...lists.values()].some((l) => l.shots.some((s) => s.path === path))
const thumbs = new Map<string, Promise<string>>() // clé : chemin + date

// Dossier de Windows (Win+Impr. écran, outil Capture) : Images\Captures d'écran (« Screenshots »).
const defaultFolder = (): string => join(app.getPath('pictures'), 'Screenshots')

function thumbnail(path: string, at: number): Promise<string> {
  const key = `${path}|${at}`
  let thumb = thumbs.get(key)
  if (!thumb) {
    thumb = nativeImage
      .createThumbnailFromPath(path, THUMB)
      .then((image) => image.toDataURL())
      .catch(() => '')
    thumbs.set(key, thumb)
    if (thumbs.size > MAX_SHOTS * 4) thumbs.delete(thumbs.keys().next().value as string)
  }
  return thumb
}

export async function screenshots(raw: unknown): Promise<Screenshot[]> {
  const folder = typeof raw === 'string' && isAbsolute(raw) ? raw : defaultFolder()
  try {
    const changed = (await stat(folder)).mtimeMs
    const last = lists.get(folder)
    if (last?.changed !== changed) {
      const names = (await readdir(folder, { withFileTypes: true }))
        .filter((entry) => entry.isFile() && EXTENSIONS.has(extname(entry.name).toLowerCase()))
        .map((entry) => entry.name)
      const files = await Promise.all(
        names.map(async (name) => {
          const path = join(folder, name)
          const at = await stat(path).then(
            (s) => s.mtimeMs,
            () => 0
          )
          return { path, name, at }
        })
      )
      const newest = files.sort((a, b) => b.at - a.at).slice(0, MAX_SHOTS)
      const shots = await Promise.all(
        newest.map(async (file) => ({ ...file, thumb: await thumbnail(file.path, file.at) }))
      )
      lists.set(folder, { changed, shots })
    }
    return lists.get(folder)?.shots ?? []
  } catch {
    lists.delete(folder)
    return [] // dossier absent : aucune capture encore faite
  }
}

// Glisser-déposer vers Discord, un mail, l'Explorateur… pendant le dragstart de l'interface.
export function screenshotDrag(sender: WebContents, path: unknown): void {
  if (!listed(path)) return
  const icon = nativeImage.createFromPath(path).resize({ width: 96 })
  sender.startDrag({ file: path, icon: icon.isEmpty() ? nativeImage.createEmpty() : icon })
}

export async function screenshotCopy(path: unknown): Promise<boolean> {
  if (!listed(path)) return false
  const image = nativeImage.createFromPath(path)
  if (image.isEmpty()) return false
  const png = new Blob([new Uint8Array(image.toPNG())], { type: 'image/png' })
  await clipboard.write([new ClipboardItem({ 'image/png': png })])
  return true
}

export async function screenshotDelete(path: unknown): Promise<boolean> {
  if (!listed(path)) return false
  try {
    await shell.trashItem(path)
    lists.clear() // relu au prochain passage
    return true
  } catch {
    return false
  }
}
