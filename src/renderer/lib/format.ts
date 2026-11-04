// Tailles et pourcentages en français (« 1,8 Go », « 14 % »), partagés par les widgets.
const UNITS = ['o', 'Ko', 'Mo', 'Go', 'To']

export function bytes(n: number): string {
  let i = 0
  while (n >= 1024 && i < UNITS.length - 1) {
    n /= 1024
    i++
  }
  return `${n.toLocaleString('fr-FR', { maximumFractionDigits: n < 10 && i > 1 ? 1 : 0 })} ${UNITS[i]}`
}

export const percent = (n: number): string =>
  `${n.toLocaleString('fr-FR', { maximumFractionDigits: n < 10 ? 1 : 0 })} %`
