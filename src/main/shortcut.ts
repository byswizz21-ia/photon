// Raccourcis globaux (Photon, barre de commande) : le raccourci choisi, sinon le premier repli
// que Windows laisse libre et que l'autre raccourci de Photon n'occupe pas.
import { globalShortcut } from 'electron'

// Touches maintenues : Windows répète l'appel (Electron ne demande pas MOD_NOREPEAT).
// On ignore tout appel arrivé moins de 550 ms après le précédent (délai de répétition par défaut).
const REPEAT_MS = 550

const active = new Map<string, string>() // rôle → raccourci enregistré

export function registerShortcut(
  role: string,
  preferred: string,
  fallbacks: readonly string[],
  onPress: () => void
): string | null {
  const previous = active.get(role)
  if (previous) globalShortcut.unregister(previous)
  active.delete(role)
  const taken = new Set(active.values())
  let lastPress = 0
  const press = (): void => {
    const now = Date.now()
    const repeated = now - lastPress < REPEAT_MS
    lastPress = now
    if (!repeated) onPress()
  }
  const candidates = [preferred, ...fallbacks.filter((s) => s !== preferred)]
  for (const accelerator of candidates.filter((s) => !taken.has(s))) {
    try {
      if (globalShortcut.register(accelerator, press)) {
        active.set(role, accelerator)
        return accelerator
      }
    } catch {
      // accélérateur invalide (settings.json édité à la main) : on passe au suivant
    }
    console.warn(`[photon] raccourci indisponible : ${accelerator}`)
  }
  return null
}
