// Sorts d'Urgot (clavier AZERTY) : temps de recharge et confirmation de R, sans Svelte (testé).
export type SpellKey = 'A' | 'Z' | 'E' | 'R'

export const SPELL_KEYS: readonly SpellKey[] = ['A', 'Z', 'E', 'R']

export const COOLDOWNS: Record<SpellKey, number> = { A: 4, Z: 6, E: 2, R: 8 } // secondes
export const ARM_MS = 4_000 // R armé : le 2e appui doit venir dans ce délai

// Secondes de recharge restantes, arrondies au-dessus ; 0 : sort prêt.
export function remaining(key: SpellKey, castAt: number | undefined, now: number): number {
  if (castAt === undefined) return 0
  return Math.max(0, Math.ceil((castAt + COOLDOWNS[key] * 1000 - now) / 1000))
}

// R armé encore valable (1er appui il y a moins de ARM_MS).
export const armed = (armedAt: number | null, now: number): boolean =>
  armedAt !== null && now - armedAt < ARM_MS

// Touche tapée → sort, sans majuscule ni modificateur ; null sinon.
export function spellFromKey(event: {
  key: string
  ctrlKey: boolean
  altKey: boolean
  metaKey: boolean
}): SpellKey | null {
  if (event.ctrlKey || event.altKey || event.metaKey) return null
  const key = event.key.toUpperCase()
  return SPELL_KEYS.find((k) => k === key) ?? null
}
