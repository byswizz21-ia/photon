// Moyenne pondérée sur 20 et note à viser au prochain contrôle.
export interface Grade {
  value: number
  outOf: number // barème : 20, 10, 100…
  coef: number
}

const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

// Notes lisibles des réglages (abîmés à la main : on ignore le reste).
export const cleanGrades = (raw: unknown[]): Grade[] =>
  raw
    .flatMap((item) => {
      const { value, outOf, coef } = (item ?? {}) as Partial<Grade>
      const ok =
        isNumber(value) &&
        isNumber(outOf) &&
        isNumber(coef) &&
        outOf > 0 &&
        coef > 0 &&
        value >= 0 &&
        value <= outOf
      return ok ? [{ value, outOf, coef }] : []
    })
    .slice(0, 100)

// Moyenne sur 20 ; null sans note.
export function average(grades: Grade[]): number | null {
  const coefs = grades.reduce((sum, g) => sum + g.coef, 0)
  if (!coefs) return null
  return grades.reduce((sum, g) => sum + (g.value / g.outOf) * 20 * g.coef, 0) / coefs
}

// Note sur 20 à avoir au prochain contrôle (coef `coef`) pour arriver à `target` de moyenne.
// Plus de 20 : impossible en un contrôle ; 0 ou moins : déjà assuré.
export function needed(grades: Grade[], target: number, coef: number): number {
  const coefs = grades.reduce((sum, g) => sum + g.coef, 0)
  const points = grades.reduce((sum, g) => sum + (g.value / g.outOf) * 20 * g.coef, 0)
  return (target * (coefs + coef) - points) / coef
}

// « 15 », « 7,5/10 », « 15 / 20 » → note ; null si illisible ou hors barème.
export function parseGrade(text: string): { value: number; outOf: number } | null {
  const match = /^(\d+(?:[.,]\d+)?)(?:\s*\/\s*(\d+(?:[.,]\d+)?))?$/.exec(text.trim())
  if (!match) return null
  const value = Number(match[1]?.replace(',', '.'))
  const outOf = match[2] ? Number(match[2].replace(',', '.')) : 20
  return outOf > 0 && value <= outOf ? { value, outOf } : null
}

// « 14,25 » : deux décimales au plus, virgule française.
export const mark = (n: number): string =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(n)
