// Accent « auto » : calcul de couleur pur (sans DOM), à partir de pixels ou d'un dégradé.
import { DEFAULT_ACCENT } from '../../shared/model'

export type Rgb = [r: number, g: number, b: number] // 0..255
export type Hsl = [h: number, s: number, l: number] // h 0..360, s et l 0..1

export function toHsl(r: number, g: number, b: number): Hsl {
  const [R, G, B] = [r / 255, g / 255, b / 255]
  const max = Math.max(R, G, B)
  const d = max - Math.min(R, G, B)
  const l = (max + Math.min(R, G, B)) / 2
  if (d === 0) return [0, 0, l]
  const s = d / (1 - Math.abs(2 * l - 1))
  const h = max === R ? ((G - B) / d + 6) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4
  return [h * 60, s, l]
}

export const hexToRgb = (hex: string): Rgb => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16)
]

function hslToHex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l)
  const channel = (n: number): string => {
    const k = (n + h / 30) % 12
    const value = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(value * 255)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${channel(0)}${channel(8)}${channel(4)}`
}

// Rend la couleur lisible sur fond sombre : saturation ≥ 0.55, luminosité entre 0.62 et 0.78.
// Un gris (pas de teinte) ne donne rien de bon : accent par défaut.
function normalize(r: number, g: number, b: number): string {
  const [h, s, l] = toHsl(r, g, b)
  if (s < 0.05) return DEFAULT_ACCENT
  return hslToHex(h, Math.max(s, 0.55), Math.min(0.78, Math.max(0.62, l)))
}

// Moyenne des pixels vifs (saturation > 0.3, luminosité 0.25–0.85), pondérée par la saturation.
export function accentFromPixels(rgba: Uint8ClampedArray): string {
  let r = 0
  let g = 0
  let b = 0
  let weight = 0
  for (let i = 0; i < rgba.length; i += 4) {
    const [pr, pg, pb] = [rgba[i] ?? 0, rgba[i + 1] ?? 0, rgba[i + 2] ?? 0]
    const [, s, l] = toHsl(pr, pg, pb)
    if (s <= 0.3 || l < 0.25 || l > 0.85) continue
    r += pr * s
    g += pg * s
    b += pb * s
    weight += s
  }
  return weight === 0 ? DEFAULT_ACCENT : normalize(r / weight, g / weight, b / weight)
}

// Dégradé : la plus saturée des deux couleurs.
export function accentFromGradient(from: string, to: string): string {
  const [a, b] = [hexToRgb(from), hexToRgb(to)]
  return normalize(...(toHsl(...a)[1] >= toHsl(...b)[1] ? a : b))
}

// Texte posé sur l'accent : sombre ou blanc, selon le meilleur contraste (luminance WCAG).
export function onAccent(hex: string): string {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }) as Rgb
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.18 ? '#07080b' : '#ffffff'
}
