// Raccourci global : le raccourci choisi, sinon le premier repli que Windows laisse libre.
import { globalShortcut } from 'electron'
import { SHORTCUTS } from '../shared/model'

export function registerShortcut(preferred: string, onPress: () => void): string | null {
  globalShortcut.unregisterAll()
  const candidates = [preferred, ...SHORTCUTS.filter((s) => s !== preferred)]
  for (const accelerator of candidates) {
    try {
      if (globalShortcut.register(accelerator, onPress)) return accelerator
    } catch {
      // accélérateur invalide (settings.json édité à la main) : on passe au suivant
    }
    console.warn(`[photon] raccourci indisponible : ${accelerator}`)
  }
  return null
}
