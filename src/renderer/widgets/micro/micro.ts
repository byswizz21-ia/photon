// Micro-entreprise : encaissements (data/micro.json, partagé entre profils), plafonds 2026,
// cotisations à mettre de côté et prochaine déclaration URSSAF.
export type Activity = 'vente' | 'services' | 'liberal'
export type Period = 'mois' | 'trimestre'

export interface Payment {
  id: string
  date: string // « 2026-11-02 », jour d'encaissement
  amount: number // centimes
  label: string
}

// Barèmes 2026 (plafonds 2026-2028, franchise de TVA, taux URSSAF hors versement libératoire).
// ponytail: valeurs en dur, à revoir chaque 1er janvier ; le taux reste modifiable dans le widget.
export const ACTIVITIES: Record<
  Activity,
  { label: string; ceiling: number; vat: number; vatMax: number; rate: number }
> = {
  vente: {
    label: 'Vente de marchandises',
    ceiling: 203_100,
    vat: 85_000,
    vatMax: 93_500,
    rate: 12.3
  },
  services: {
    label: 'Prestations de services (BIC)',
    ceiling: 83_600,
    vat: 37_500,
    vatMax: 41_250,
    rate: 21.2
  },
  liberal: {
    label: 'Profession libérale (BNC)',
    ceiling: 83_600,
    vat: 37_500,
    vatMax: 41_250,
    rate: 26.1
  }
}

const DAY = /^\d{4}-\d{2}-\d{2}$/
const MAX_PAYMENTS = 3_000

export function parseMicro(raw: unknown): { payments: Payment[] } {
  const items = (raw as { payments?: unknown } | null)?.payments
  const payments = (Array.isArray(items) ? items : [])
    .filter(
      (p): p is Payment =>
        typeof p?.id === 'string' &&
        typeof p.date === 'string' &&
        DAY.test(p.date) &&
        Number.isSafeInteger(p.amount) &&
        p.amount > 0 &&
        typeof p.label === 'string'
    )
    .slice(-MAX_PAYMENTS)
    .map(({ id, date, amount, label }) => ({ id, date, amount, label: label.slice(0, 60) }))
  return { payments }
}

// « 1 234,50 », « 1234.5 », « 800 € » → centimes ; null si illisible, nul ou négatif.
export function parseAmount(text: string): number | null {
  const clean = text.replace(/[\s€]/g, '').replace(',', '.') // \s : espaces insécables compris
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null
  const cents = Math.round(Number(clean) * 100)
  return cents > 0 && Number.isSafeInteger(cents) ? cents : null
}

// Somme des encaissements entre deux jours « AAAA-MM-JJ » (compris).
export const total = (payments: Payment[], from: string, to: string): number =>
  payments.filter((p) => p.date >= from && p.date <= to).reduce((sum, p) => sum + p.amount, 0)

const key = (y: number, m: number, d: number): string => {
  const date = new Date(y, m, d)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export interface Declaration {
  from: string // premier jour de la période déclarée
  to: string // dernier jour
  deadline: string // dernier jour pour déclarer : fin du mois qui suit la période
  name: string // « octobre 2026 », « 4e trimestre 2026 »
}

// Prochaine déclaration à faire : la plus ancienne période dont l'échéance n'est pas passée.
export function nextDeclaration(today: string, period: Period): Declaration {
  const [y, m] = [Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1]
  const months = period === 'mois' ? 1 : 3
  // Début de la période qui contient aujourd'hui, puis on recule d'une période.
  let start = new Date(y, m - (m % months) - months, 1)
  for (;;) {
    const sy = start.getFullYear()
    const sm = start.getMonth()
    const deadline = key(sy, sm + months + 1, 0) // dernier jour du mois qui suit la période
    if (deadline >= today) {
      const monthName = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })
      const quarter = Math.floor(sm / 3) + 1
      return {
        from: key(sy, sm, 1),
        to: key(sy, sm + months, 0),
        deadline,
        name:
          period === 'mois'
            ? monthName.format(start)
            : `${quarter}${quarter === 1 ? 'er' : 'e'} trimestre ${sy}`
      }
    }
    start = new Date(sy, sm + months, 1)
  }
}

// « 12 345 € » (arrondi à l'euro) ou « 12 345,50 € ».
export function euros(cents: number, exact = false): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: exact ? 2 : 0,
    minimumFractionDigits: exact && cents % 100 !== 0 ? 2 : 0
  }).format(cents / 100)
}
