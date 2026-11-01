// Images servies à l'interface par le protocole photon:// :
//   photon://wallpaper → fond d'écran Windows actuel ; photon://image → image choisie dans le thème ;
//   photon://images/<nom> → image d'un widget Image, copiée dans %APPDATA%/Photon/images.
// Rien d'autre n'est servi : l'interface ne peut pas lire un fichier quelconque du disque.
import { app, dialog, net, protocol } from 'electron'
import { randomUUID } from 'node:crypto'
import { copyFile, mkdir, stat } from 'node:fs/promises'
import { extname, join } from 'node:path'
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

const MAX_IMAGE_BYTES = 30 * 1024 * 1024
const imagesDir = (): string => join(app.getPath('userData'), 'images')
export const isImageName = (name: string): boolean =>
  /^[\w-]{1,64}\.\w{2,5}$/.test(name) && IMAGE_EXTENSIONS.includes(extname(name).slice(1))

// Widget Image : copie l'image (choisie ou glissée) chez Photon et renvoie son nom ; l'original
// peut ensuite bouger. null si ce n'est pas une image ou si elle est trop lourde.
// ponytail: les copies remplacées ou d'un widget supprimé restent sur le disque ; ménage à faire
// si le dossier grossit.
export async function importImage(path: unknown): Promise<string | null> {
  if (typeof path !== 'string') return null
  const extension = extname(path).slice(1).toLowerCase()
  if (!IMAGE_EXTENSIONS.includes(extension)) return null
  try {
    if ((await stat(path)).size > MAX_IMAGE_BYTES) return null
    const name = `${randomUUID()}.${extension}`
    await mkdir(imagesDir(), { recursive: true })
    await copyFile(path, join(imagesDir(), name))
    return name
  } catch {
    return null
  }
}

function fileFor(url: URL): string | null {
  if (url.host === 'wallpaper') return wallpaperPath()
  if (url.host === 'image') return themeImagePath()
  const name = url.pathname.slice(1)
  return url.host === 'images' && isImageName(name) ? join(imagesDir(), name) : null
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

// Boîte « choisir une image » (fond du thème, widget Image).
export async function pickImage(): Promise<string | null> {
  const result = await withModal((parent) =>
    dialog.showOpenDialog(parent, {
      title: 'Choisir une image',
      defaultPath: app.getPath('pictures'),
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: IMAGE_EXTENSIONS }]
    })
  )
  return result.canceled ? null : (result.filePaths[0] ?? null)
}
