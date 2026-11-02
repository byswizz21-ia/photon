// Classement de la barre de commande : qualité de la correspondance + habitudes (fréquence, récence).
// Une ou deux lettres suffisent pour une app souvent lancée.

// Minuscules sans accents : « Été » trouve « ete ».
export const normalize = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

const WORD_START = /[\s\-_.()[\]]/

// 0 = aucune correspondance. `fuzzy` : lettres dans l'ordre (« dscd » → Discord), pour les apps.
export const matchScore = (name: string, query: string, fuzzy = false): number =>
  keyScore(normalize(name), normalize(query), fuzzy)

// Même score sur des textes déjà normalisés (index des fichiers : 110 000 noms par frappe).
export function keyScore(n: string, q: string, fuzzy = false): number {
  if (!q) return 0
  if (n === q) return 100
  if (n.startsWith(q)) return 80
  const at = n.indexOf(q)
  if (at > 0 && WORD_START.test(n[at - 1] ?? '')) return 65
  // Initiales : « vsc » → Visual Studio Code.
  if (q.length >= 2) {
    const initials = n
      .split(WORD_START)
      .filter(Boolean)
      .map((word) => word[0])
      .join('')
    if (initials.startsWith(q)) return 60
  }
  if (at > 0) return 45
  if (!fuzzy) return 0
  let i = 0
  for (const char of n) if (char === q[i]) i++
  return i === q.length ? 20 : 0
}

export interface Usage {
  count: number
  last: number // ms
}

const DAY_MS = 86_400_000

// Habitudes : jusqu'à +30 pour la fréquence, +12 si utilisé aujourd'hui, +6 cette semaine.
export function usageBoost(usage: Usage | undefined, now: number): number {
  if (!usage) return 0
  const frequency = Math.min(30, 10 * Math.log2(1 + usage.count))
  const age = now - usage.last
  return frequency + (age < DAY_MS ? 12 : age < 7 * DAY_MS ? 6 : 0)
}

// « ytb.com », « github.com/x », « https://… » : un site plutôt qu'une recherche. Un nom de
// fichier (« rapport.pdf », « notes.md ») n'en est pas un, sauf adresse complète ou avec chemin.
const SITE = /^(https?:\/\/)?[\w-]+(\.[\w-]+)*\.([a-z]{2,})(:\d+)?(\/\S*)?$/i
const FILE_EXTENSIONS = new Set(
  'pdf md txt doc docx xls xlsx ppt pptx csv json js ts py exe msi zip rar png jpg jpeg gif webp mp3 mp4 mov svg lnk ini log bat ps1'.split(
    ' '
  )
)

export function looksLikeSite(text: string): boolean {
  const match = SITE.exec(text)
  if (!match) return false
  const explicit = Boolean(match[1] || match[5])
  return explicit || !FILE_EXTENSIONS.has((match[3] ?? '').toLowerCase())
}
