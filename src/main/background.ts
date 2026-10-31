// Images de fond servies à l'interface par le protocole photon:// :
//   photon://wallpaper → fond d'écran Windows actuel ; photon://image → image choisie dans le thème.
// Rien d'autre n'est servi : l'interface ne peut pas lire un fichier quelconque du disque.
import { app, dialog, net, protocol } from 'electron'
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

export function serveBackgrounds(): void {
  protocol.handle('photon', async (request) => {
    const { host } = new URL(request.url)
    const file = host === 'wallpaper' ? wallpaperPath() : host === 'image' ? themeImagePath() : null
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

// Boîte « choisir une image de fond ».
export async function pickImage(): Promise<string | null> {
  const result = await withModal((parent) =>
    dialog.showOpenDialog(parent, {
      title: 'Choisir une image de fond',
      defaultPath: app.getPath('pictures'),
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: IMAGE_EXTENSIONS }]
    })
  )
  return result.canceled ? null : (result.filePaths[0] ?? null)
}
