// Images servies à l'interface par le protocole photon:// :
//   photon://wallpaper → fond d'écran Windows actuel ; photon://image → image choisie dans le thème ;
//   photon://images|videos|fonts/<nom> → copies faites par importFile (ci-dessous) et importUrl.
// Rien d'autre n'est servi : l'interface ne peut pas lire un fichier quelconque du disque.
import { app, dialog, net, protocol } from 'electron'
import { randomUUID } from 'node:crypto'
import { copyFile, mkdir, stat, writeFile } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { IMAGE_EXTENSIONS, VIDEO_EXTENSIONS, type FileKind } from '../shared/api'
import { data } from './data'
import { withModal } from './window'

// À appeler avant app.whenReady() : schéma « sécurisé » et CORS pour lire l'image dans un canvas
// (extraction de la couleur d'accent) ; stream pour les vidéos (sinon refusées par <video>).
export function registerBackgroundScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'photon',
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
        stream: true
      }
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

// Fichiers copiés chez Photon (%APPDATA%/Photon/<dossier>) : images et vidéos des widgets Image,
// GIF et Vidéo, polices importées. Servis par photon://<dossier>/<nom>.
const MB = 1024 * 1024
export const KINDS: Record<FileKind, { dir: string; extensions: string[]; maxBytes: number }> = {
  image: { dir: 'images', extensions: IMAGE_EXTENSIONS, maxBytes: 30 * MB },
  video: { dir: 'videos', extensions: VIDEO_EXTENSIONS, maxBytes: 500 * MB },
  font: { dir: 'fonts', extensions: ['ttf', 'otf', 'woff', 'woff2'], maxBytes: 20 * MB }
}
const isKind = (v: unknown): v is FileKind => typeof v === 'string' && Object.hasOwn(KINDS, v)
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
    const name = copyName(basename(path, extname(path)), extension)
    await mkdir(kindDir(kind), { recursive: true })
    await copyFile(path, join(kindDir(kind), name))
    return name
  } catch {
    return null
  }
}

const copyName = (base: string, extension: string): string =>
  `${base.replace(/[^\w-]+/g, '-').slice(0, 40) || 'fichier'}-${randomUUID().slice(0, 8)}.${extension}`

// Enregistre un fichier téléchargé (download.ts), type et taille déjà vérifiés ; nom de la copie.
export async function saveCopy(
  kind: FileKind,
  base: string,
  extension: string,
  bytes: Uint8Array
): Promise<string> {
  const name = copyName(base, extension)
  await mkdir(kindDir(kind), { recursive: true })
  await writeFile(join(kindDir(kind), name), bytes)
  return name
}

function fileFor(url: URL): string | null {
  if (url.host === 'wallpaper') return wallpaperPath()
  if (url.host === 'image') return themeImagePath()
  const name = url.pathname.slice(1)
  const kind = (Object.keys(KINDS) as FileKind[]).find((k) => KINDS[k].dir === url.host)
  return kind && isCopyName(kind, name) ? join(kindDir(kind), name) : null
}

// En-tête Range d'une vidéo (« bytes=0- », « bytes=100-199 ») : octets demandés, bornés au fichier.
// null : pas de Range (fichier entier) ; 'invalid' : hors du fichier (réponse 416).
export function byteRange(
  header: string | null,
  size: number
): { start: number; end: number } | 'invalid' | null {
  const match = /^bytes=(\d+)-(\d*)$/.exec(header ?? '')
  if (!match) return null
  const start = Number(match[1])
  const end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1
  return start <= end ? { start, end } : 'invalid'
}

export function serveBackgrounds(): void {
  protocol.handle('photon', async (request) => {
    const file = fileFor(new URL(request.url))
    if (!file) return new Response(null, { status: 404 })
    try {
      // Vidéos : lues par morceaux (Range). net.fetch coupe bien le fichier mais répond 200 sans
      // Content-Range : on remet le statut 206 et les en-têtes qu'attend le lecteur.
      const { size } = await stat(file)
      const range = byteRange(request.headers.get('Range'), size)
      if (range === 'invalid') return new Response(null, { status: 416 })
      const response = await net.fetch(pathToFileURL(file).toString(), {
        headers: range ? { Range: `bytes=${range.start}-${range.end}` } : {}
      })
      const headers = new Headers(response.headers)
      headers.set('Access-Control-Allow-Origin', '*')
      headers.set('Accept-Ranges', 'bytes')
      if (!range) return new Response(response.body, { status: response.status, headers })
      headers.set('Content-Range', `bytes ${range.start}-${range.end}/${size}`)
      headers.set('Content-Length', String(range.end - range.start + 1))
      return new Response(response.body, { status: 206, headers })
    } catch {
      return new Response(null, { status: 404 }) // fichier déplacé ou supprimé
    }
  })
}

const PICKERS = {
  image: { title: 'Choisir une image', folder: 'pictures', filter: 'Images' },
  video: { title: 'Choisir une vidéo', folder: 'videos', filter: 'Vidéos' },
  font: { title: 'Choisir une police', folder: 'downloads', filter: 'Polices' }
} as const

// Boîte « choisir une image » (fond du thème, widgets Image et GIF), « une vidéo » ou « une police ».
export async function pickFile(kind: unknown): Promise<string | null> {
  const type = isKind(kind) ? kind : 'image'
  const { title, folder, filter } = PICKERS[type]
  const result = await withModal((parent) =>
    dialog.showOpenDialog(parent, {
      title,
      defaultPath: app.getPath(folder),
      properties: ['openFile'],
      filters: [{ name: filter, extensions: KINDS[type].extensions }]
    })
  )
  return result.canceled ? null : (result.filePaths[0] ?? null)
}
