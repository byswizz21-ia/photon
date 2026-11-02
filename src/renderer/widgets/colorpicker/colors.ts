// Couleur « #rrggbb » écrite dans les formats qu'on colle dans du code ou un logiciel de dessin.
// Conversions : celles de l'accent du thème (theme/accent.ts).
import { hexToRgb, toHsl } from '../../theme/accent'

export const isHex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/.test(v)

export function formats(hex: string): { label: string; value: string }[] {
  const [r, g, b] = hexToRgb(hex)
  const [h, s, l] = toHsl(r, g, b)
  const pct = (v: number): number => Math.round(v * 100)
  return [
    { label: 'HEX', value: hex.toUpperCase() },
    { label: 'RGB', value: `rgb(${r}, ${g}, ${b})` },
    { label: 'HSL', value: `hsl(${Math.round(h) % 360}, ${pct(s)}%, ${pct(l)}%)` }
  ]
}
