// Tirages équitables : nombres du générateur cryptographique, sans biais de modulo.

// Entier de 0 à n - 1.
const uint32 = (): number => crypto.getRandomValues(new Uint32Array(1))[0] ?? 0

export function randomInt(n: number, next = uint32): number {
  if (!Number.isInteger(n) || n < 1) return 0
  const limit = Math.floor(2 ** 32 / n) * n // au-delà, certaines valeurs sortiraient plus souvent
  for (;;) {
    const value = next()
    if (value < limit) return value % n
  }
}

// Noms d'une liste, un par ligne, sans lignes vides ni doublons.
export const names = (text: string): string[] => [
  ...new Set(
    text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
  )
]

// Tirage sans remise : un nom pas encore sorti ; tout est sorti → on repart de la liste entière.
export function draw(all: string[], drawn: string[]): { name: string; drawn: string[] } | null {
  if (!all.length) return null
  const left = all.filter((name) => !drawn.includes(name))
  const pool = left.length ? left : all
  const name = pool[randomInt(pool.length)] as string
  return { name, drawn: left.length ? [...drawn, name] : [name] }
}
