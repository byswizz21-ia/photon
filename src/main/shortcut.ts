// Raccourci global : le raccourci choisi, sinon le premier repli que Windows laisse libre.
import { globalShortcut } from 'electron'
import { SHORTCUTS } from '../shared/model'

// Touches maintenues : Windows répète l'appel (Electron ne demande pas MOD_NOREPEAT).
// On ignore tout appel arrivé moins de 550 ms après le précédent (délai de répétition par défaut).
const REPEAT_MS = 550

export function registerShortcut(preferred: string, onPress: () => void): string | null {
  globalShortcut.unregisterAll()
  let lastPress = 0
  const press = (): void => {
    const now = Date.now()
    const repeated = now - lastPress < REPEAT_MS
    lastPress = now
    if (!repeated) onPress()
  }
  const candidates = [preferred, ...SHORTCUTS.filter((s) => s !== preferred)]
  for (const accelerator of candidates) {
    try {
      if (globalShortcut.register(accelerator, press)) return accelerator
    } catch {
      // accélérateur invalide (settings.json édité à la main) : on passe au suivant
    }
    console.warn(`[photon] raccourci indisponible : ${accelerator}`)
  }
  return null
}
