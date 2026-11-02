// Pipette (widget Couleurs) : Photon se cache, l'utilisateur clique n'importe où sur ses écrans,
// l'outil natif colorpicker.cs lit le pixel, Photon revient. La pipette du navigateur (EyeDropper)
// ne sort pas de la fenêtre sous Electron/Windows (electron#27980).
import source from './colorpicker.cs?raw'
import { nativeTool } from './native'
import { hideWindow, showWindow } from './window'

const tool = nativeTool(source, 'Photon.ColorPicker')
const WAIT_MS = 35_000 // l'outil abandonne seul au bout de 30 s
const HIDE_MS = 250 // laisser la fenêtre disparaître avant de lire l'écran

let picking = false

// « #rrggbb », ou null : annulé, déjà en cours, outil indisponible.
export async function pickColor(): Promise<string | null> {
  if (picking) return null
  picking = true
  try {
    tool.start() // compilation (≈ 0,6 s) pendant que la fenêtre se cache
    hideWindow('pipette')
    await new Promise((resolve) => setTimeout(resolve, HIDE_MS))
    const reply = await tool.send('pick', WAIT_MS)
    return reply && /^#[0-9a-f]{6}$/.test(reply) ? reply : null
  } finally {
    picking = false
    void showWindow()
  }
}
