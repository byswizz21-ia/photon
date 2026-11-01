// Multi-écran : sur quel écran ouvrir Photon, sans recouvrir une app en plein écran.
// Règle (design doc) : écran choisi → s'il est en plein écran, écran de la souris → sinon premier
// écran libre ; aucun écran libre : mini-mode (barre seule) par-dessus, sur l'écran choisi.
import { screen, type Display } from 'electron'
import type { DisplayInfo } from '../shared/api'
import source from './screens.cs?raw'
import { nativeTool } from './native'

const tool = nativeTool(source, 'Photon.Screens')
// Au-delà, on ouvre sans connaître les pleins écrans : l'ouverture doit rester instantanée.
const WAIT_MS = 150
const WARM_UP_MS = 5000 // compilation de l'outil après le démarrage, pas pendant

export function startScreens(): void {
  setTimeout(tool.start, WARM_UP_MS)
}

// choice : 'mouse' | 'primary' | id d'écran (réglage). Écran fixe débranché → écran de la souris.
export function chooseDisplay<T extends { id: number }>(
  displays: T[],
  busy: ReadonlySet<number>,
  choice: string,
  cursor: T,
  primary: T
): { display: T; mini: boolean } {
  const chosen =
    choice === 'primary' ? primary : (displays.find((d) => String(d.id) === choice) ?? cursor)
  const free = [chosen, cursor, ...displays].find((d) => !busy.has(d.id))
  return free ? { display: free, mini: false } : { display: chosen, mini: true }
}

interface BusyRect {
  x: number
  y: number
  width: number
  height: number
  window?: string
}

// Écrans (ids Electron) occupés par une app en plein écran. L'outil répond en pixels physiques :
// on convertit chaque écran Electron (pixels logiques) avant de comparer.
async function busyDisplays(displays: Display[]): Promise<Set<number>> {
  let rects: BusyRect[] = []
  try {
    const raw: unknown = JSON.parse((await tool.send(`busy ${process.pid}`, WAIT_MS)) ?? '[]')
    if (Array.isArray(raw)) rects = raw as BusyRect[]
  } catch {
    // réponse illisible : aucun plein écran connu
  }
  const near = (a: number, b: number): boolean => Math.abs(a - b) <= 2
  const busy = new Set<number>()
  for (const display of displays) {
    const p = screen.dipToScreenRect(null, display.bounds)
    const rect = rects.find(
      (r) => near(r.x, p.x) && near(r.y, p.y) && near(r.width, p.width) && near(r.height, p.height)
    )
    if (rect) {
      busy.add(display.id)
      console.log(`[photon] plein écran sur ${display.label || display.id} : ${rect.window ?? '?'}`)
    }
  }
  return busy
}

export async function targetDisplay(choice: string): Promise<{ display: Display; mini: boolean }> {
  const displays = screen.getAllDisplays()
  const cursor = screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
  const busy = await busyDisplays(displays)
  return chooseDisplay(displays, busy, choice, cursor, screen.getPrimaryDisplay())
}

// Liste pour le réglage « Écran », de gauche à droite.
export function displayList(): DisplayInfo[] {
  const primary = screen.getPrimaryDisplay().id
  return screen
    .getAllDisplays()
    .sort((a, b) => a.bounds.x - b.bounds.x || a.bounds.y - b.bounds.y)
    .map((d, index) => {
      const size = `${Math.round(d.size.width * d.scaleFactor)}×${Math.round(d.size.height * d.scaleFactor)}`
      const name = d.label || `Écran ${index + 1}`
      return {
        id: String(d.id),
        label: `${name} (${size})${d.id === primary ? ', principal' : ''}`
      }
    })
}

// Configuration d'écrans actuelle : la position en mode fenêtre est mémorisée pour chacune.
export const screensKey = (): string =>
  screen
    .getAllDisplays()
    .map((d) => `${d.bounds.x},${d.bounds.y},${d.bounds.width}x${d.bounds.height}`)
    .sort()
    .join('|')
