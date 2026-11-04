// Thèmes prêts : appliqués d'un clic (Réglages) ou attachés à un modèle de profil (templates.ts).
import { defaultTheme, type Theme } from './model'

export const THEME_PRESETS: Record<string, { name: string; theme: () => Theme }> = {
  urgot: {
    name: 'Urgot',
    theme: () => ({
      ...defaultTheme(),
      background: { type: 'glow', scene: 'urgot' },
      accent: '#b4f24a',
      opacity: 0.6,
      radius: 8,
      blur: 48,
      tint: '#0b0e09',
      glowSecondary: '#d4672a',
      font: { family: 'Chakra Petch', weight: 0, scale: 1 }
    })
  }
}
