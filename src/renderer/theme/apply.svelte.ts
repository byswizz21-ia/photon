// Applique le thème : variables CSS sur <html>, et accent « auto » extrait du fond.
import { IMAGE_URL, WALLPAPER_URL } from '../../shared/api'
import { DEFAULT_ACCENT, type Background } from '../../shared/model'
import { app } from '../state.svelte'
import { accentFromGradient, accentFromPixels, onAccent } from './accent'

const SAMPLE = 48 // côté (px) de l'image réduite dont on lit les pixels

let extracted = $state(DEFAULT_ACCENT) // accent calculé depuis le fond

// Accent réellement affiché : celui du thème, ou celui extrait du fond.
export const resolvedAccent = (): string =>
  app.theme.accent === 'auto' ? extracted : app.theme.accent

// Adresse de l'image de fond ; null pour un dégradé. Le chemin dans l'URL force le rechargement.
export const backgroundUrl = (bg: Background): string | null =>
  bg.type === 'wallpaper'
    ? WALLPAPER_URL
    : bg.type === 'image'
      ? `${IMAGE_URL}?v=${encodeURIComponent(bg.path)}`
      : null

// Pixels RGBA de l'image réduite à 48 × 48 px.
async function readPixels(url: string): Promise<Uint8ClampedArray> {
  const image = new Image()
  image.crossOrigin = 'anonymous' // photon:// envoie les en-têtes CORS : le canvas reste lisible
  image.src = url
  await image.decode()
  const canvas = new OffscreenCanvas(SAMPLE, SAMPLE)
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('canvas indisponible')
  context.drawImage(image, 0, 0, SAMPLE, SAMPLE)
  return context.getImageData(0, 0, SAMPLE, SAMPLE).data
}

// À appeler une fois depuis App.svelte (les effets ont besoin d'un composant).
export function useTheme(): void {
  const auto = $derived(app.theme.accent === 'auto')

  // Recalcul seulement quand le fond change (et au démarrage), jamais à l'ouverture de Photon.
  $effect(() => {
    if (!auto) return
    const bg = app.theme.background
    const url = backgroundUrl(bg)
    if (!url) {
      extracted = bg.type === 'gradient' ? accentFromGradient(bg.from, bg.to) : DEFAULT_ACCENT
      return
    }
    let current = true // faux si le fond a encore changé pendant le chargement
    void readPixels(url).then(
      (pixels) => current && (extracted = accentFromPixels(pixels)),
      () => current && (extracted = DEFAULT_ACCENT) // image absente : accent par défaut
    )
    return () => {
      current = false
    }
  })

  $effect(() => {
    const { theme } = app
    const accent = resolvedAccent()
    const style = document.documentElement.style
    style.setProperty('--accent', accent)
    style.setProperty('--on-accent', onAccent(accent))
    style.setProperty('--glass', String(theme.opacity))
    style.setProperty('--radius', `${theme.radius}px`)
    style.setProperty('--radius-panel', `${theme.radius + 8}px`)
    style.setProperty('--blur', `${theme.blur}px`)
  })
}
