// Flou réglable en mode fenêtre (réglage liveBlur) : Windows ne laisse pas régler son flou
// acrylic, alors Photon filme l'écran derrière lui et le floute lui-même (backdrop-filter).
// La fenêtre est exclue de la capture (WDA_EXCLUDEFROMCAPTURE) : on ne filme que ce qu'il y a
// derrière. L'interface ne filme que fenêtre visible : ≈ 2 % de CPU ouvert, rien caché.
import {
  desktopCapturer,
  screen,
  session,
  webContents,
  type BrowserWindow,
  type DesktopCapturerSource
} from 'electron'
import { data } from './data'

const WARM_UP_MS = 5000 // liste des écrans lue après le démarrage, pas pendant

// Liste lue à l'avance (≈ 400 ms) : la capture démarre alors en ≈ 250 ms à l'ouverture.
let sources: DesktopCapturerSource[] = []

async function refresh(): Promise<void> {
  sources = await desktopCapturer
    .getSources({ types: ['screen'], thumbnailSize: { width: 0, height: 0 } })
    .catch(() => sources)
}

export const liveBlurOn = (): boolean => data.settings.liveBlur && data.settings.mode === 'window'

export function startBackdrop(win: BrowserWindow): void {
  setTimeout(() => void refresh(), WARM_UP_MS)
  screen.on('display-added', () => void refresh())
  screen.on('display-removed', () => void refresh())
  screen.on('display-metrics-changed', () => void refresh())
  // Seule la page de Photon peut filmer, et seulement l'écran sous sa fenêtre. Sinon : refus.
  session.defaultSession.setDisplayMediaRequestHandler(async (request, callback) => {
    const page = request.frame && webContents.fromFrame(request.frame)
    if (!liveBlurOn() || page !== win.webContents) return callback({})
    const id = String(screen.getDisplayMatching(win.getBounds()).id)
    if (!sources.some((s) => s.display_id === id)) await refresh()
    const source = sources.find((s) => s.display_id === id)
    callback(source ? { video: source } : {})
  })
}
