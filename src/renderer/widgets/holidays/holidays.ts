// Jours fériés français, calculés (aucun appel réseau) : dates fixes et fêtes liées à Pâques.
export interface Holiday {
  date: Date // minuit, heure locale
  name: string
  days: number // jours restants (0 : aujourd'hui)
  bridge: 'lundi' | 'vendredi' | null // pont possible : férié un mardi ou un jeudi
  weekend: boolean // tombe un samedi ou un dimanche
}

// Dimanche de Pâques (algorithme de Meeus/Jones/Butcher, calendrier grégorien).
export function easter(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

// Fériés d'une année, dans l'ordre. alsace : Vendredi saint et Saint-Étienne en plus (Alsace-Moselle).
export function holidaysOf(year: number, alsace: boolean): { date: Date; name: string }[] {
  const e = easter(year)
  const fromEaster = (n: number): Date => new Date(year, e.getMonth(), e.getDate() + n)
  const list = [
    { date: new Date(year, 0, 1), name: "Jour de l'an" },
    { date: fromEaster(1), name: 'Lundi de Pâques' },
    { date: new Date(year, 4, 1), name: 'Fête du Travail' },
    { date: new Date(year, 4, 8), name: 'Victoire 1945' },
    { date: fromEaster(39), name: 'Ascension' },
    { date: fromEaster(50), name: 'Lundi de Pentecôte' },
    { date: new Date(year, 6, 14), name: 'Fête nationale' },
    { date: new Date(year, 7, 15), name: 'Assomption' },
    { date: new Date(year, 10, 1), name: 'Toussaint' },
    { date: new Date(year, 10, 11), name: 'Armistice 1918' },
    { date: new Date(year, 11, 25), name: 'Noël' }
  ]
  if (alsace) {
    list.push({ date: fromEaster(-2), name: 'Vendredi saint' })
    list.push({ date: new Date(year, 11, 26), name: 'Saint-Étienne' })
  }
  return list.sort((x, y) => x.date.getTime() - y.date.getTime())
}

// Les `count` prochains fériés à partir d'aujourd'hui (compris).
export function upcoming(now: Date, count: number, alsace: boolean): Holiday[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const year = today.getFullYear()
  return [...holidaysOf(year, alsace), ...holidaysOf(year + 1, alsace)]
    .filter((h) => h.date >= today)
    .slice(0, count)
    .map(({ date, name }) => {
      const weekday = date.getDay()
      return {
        date,
        name,
        // Arrondi : un passage à l'heure d'été donne une journée de 23 ou 25 h.
        days: Math.round((date.getTime() - today.getTime()) / 86_400_000),
        bridge: weekday === 2 ? 'lundi' : weekday === 4 ? 'vendredi' : null,
        weekend: weekday === 0 || weekday === 6
      }
    })
}
