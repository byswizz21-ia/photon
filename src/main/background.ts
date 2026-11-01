// Images servies à l'interface par le protocole photon:// :
//   photon://wallpaper → fond d'écran Windows actuel ; photon://image → image choisie dans le thème ;
//   photon://images/<nom>, photon://fonts/<nom> → copies faites par importFile (ci-dessous).
// Rien d'autre n'est servi : l'interface ne peut pas lire un fichier quelconque du disque.
import { app, dialog, net, protocol } from 'electron'
import { randomUUID } from 'node:crypto'
import { copyFile, mkdir, stat } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { data } from './data'
import { withModal } from './window'

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'bmp']

// À appeler avant app.whenReady() : schéma « sécurisé » et CORS pour lire l'image dans un canvas
// (extraction de la couleur d'accent).
export function registerBackgroundScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'photon',
      privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true }
    }
  ])
}

// Copie que Windows garde du fond d'écran affiché (absente si le fond est une couleur unie).
const wallpaperPath = (): string =>
  join(app.getPath('appData'), 'Microsoft', 'Windows', 'Themes', 'TranscodedWallpaper')

function themeImagePath(): string | null {
  const { background } = data.theme
  if (background.type !== 'image') return null
  const extension = extname(background.path).slice(1).toLowerCase()
  return IMAGE_EXTENSIONS.includes(extension) ? background.path : null
}

// Fichiers copiés chez Photon (%APPDATA%/Photon/<dossier>) : images des widgets Image, polices
// importées. Servis par photon://images/<nom> et photon://fonts/<nom>.
export type FileKind = 'image' | 'font'
const KINDS: Record<FileKind, { dir: string; extensions: string[]; maxBytes: number }> = {
  image: { dir: 'images', extensions: IMAGE_EXTENSIONS, maxBytes: 30 * 1024 * 1024 },
  font: { dir: 'fonts', extensions: ['ttf', 'otf', 'woff', 'woff2'], maxBytes: 20 * 1024 * 1024 }
}
const isKind = (v: unknown): v is FileKind => v === 'image' || v === 'font'
const kindDir = (kind: FileKind): string => join(app.getPath('userData'), KINDS[kind].dir)

// Nom d'une copie : jamais un chemin (pas de / ni de ..), extension du bon type.
export const isCopyName = (kind: FileKind, name: string): boolean =>
  /^[\w-]{1,64}\.\w{2,5}$/.test(name) && KINDS[kind].extensions.includes(extname(name).slice(1))

// Copie le fichier (choisi ou glissé) chez Photon et renvoie son nom ; l'original peut ensuite
// bouger. Le nom garde celui d'origine (« Inter-3f2b9c1a.ttf ») pour l'afficher.
// null si le type ne va pas ou si le fichier est trop lourd.
// ponytail: les copies remplacées ou plus utilisées restent sur le disque ; ménage à faire si le
// dossier grossit.
export async function importFile(kind: unknown, path: unknown): Promise<string | null> {
  if (!isKind(kind) || typeof path !== 'string') return null
  const extension = extname(path).slice(1).toLowerCase()
  if (!KINDS[kind].extensions.includes(extension)) return null
  try {
    if ((await stat(path)).size > KINDS[kind].maxBytes) return null
    const base = basename(path, extname(path))
      .replace(/[^\w-]+/g, '-')
      .slice(0, 40)
    const name = `${base}-${randomUUID().slice(0, 8)}.${extension}`
    await mkdir(kindDir(kind), { recursive: true })
    await copyFile(path, join(kindDir(kind), name))
    return name
  } catch {
    return null
  }
}

function fileFor(url: URL): string | null {
  if (url.host === 'wallpaper') return wallpaperPath()
  if (url.host === 'image') return themeImagePath()
  const name = url.pathname.slice(1)
  const kind = url.host === 'images' ? 'image' : url.host === 'fonts' ? 'font' : null
  return kind && isCopyName(kind, name) ? join(kindDir(kind), name) : null
}

export function serveBackgrounds(): void {
  protocol.handle('photon', async (request) => {
    const file = fileFor(new URL(request.url))
    if (!file) return new Response(null, { status: 404 })
    try {
      const response = await net.fetch(pathToFileURL(file).toString())
      const headers = new Headers(response.headers)
      headers.set('Access-Control-Allow-Origin', '*')
      return new Response(response.body, { status: response.status, headers })
    } catch {
      return new Response(null, { status: 404 }) // fichier déplacé ou supprimé
    }
  })
}

// Boîte « choisir une image » (fond du thème, widget Image) ou « une police ».
export async function pickFile(kind: unknown): Promise<string | null> {
  const font = kind === 'font'
  const result = await withModal((parent) =>
    dialog.showOpenDialog(parent, {
      title: font ? 'Choisir une police' : 'Choisir une image',
      defaultPath: app.getPath(font ? 'downloads' : 'pictures'),
      properties: ['openFile'],
      filters: [
        font
          ? { name: 'Polices', extensions: KINDS.font.extensions }
          : { name: 'Images', extensions: IMAGE_EXTENSIONS }
      ]
    })
  )
  return result.canceled ? null : (result.filePaths[0] ?? null)
}
