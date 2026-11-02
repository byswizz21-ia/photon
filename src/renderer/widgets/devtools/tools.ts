// Petites conversions de développeur, sur place (aucun appel réseau) : Base64, URL, JSON,
// horodatage, SHA-256, UUID. Chaque outil rend { ok, text } : en cas d'échec, text dit pourquoi.
export type Tool = 'base64' | 'url' | 'json' | 'time' | 'sha256' | 'uuid'
export type Result = { ok: boolean; text: string }

const ok = (text: string): Result => ({ ok: true, text })
const fail = (text: string): Result => ({ ok: false, text })

// Base64 en UTF-8 (btoa seul casse sur les accents).
export function base64(input: string, decode: boolean): Result {
  try {
    if (!decode) {
      let binary = '' // boucle : String.fromCharCode(...octets) déborde sur un long texte
      for (const byte of new TextEncoder().encode(input)) binary += String.fromCharCode(byte)
      return ok(btoa(binary))
    }
    const clean = input.trim().replace(/-/g, '+').replace(/_/g, '/') // Base64 « URL » aussi
    const binary = atob(clean.padEnd(Math.ceil(clean.length / 4) * 4, '='))
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
    return ok(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
  } catch {
    return fail(decode ? 'Pas du Base64 valide (ou pas du texte)' : 'Texte illisible')
  }
}

export function url(input: string, decode: boolean): Result {
  try {
    return ok(decode ? decodeURIComponent(input.replace(/\+/g, ' ')) : encodeURIComponent(input))
  } catch {
    return fail('Encodage % invalide')
  }
}

// Mis en forme (2 espaces) ; « decode » = compacté sur une ligne.
export function json(input: string, minify: boolean): Result {
  try {
    return ok(JSON.stringify(JSON.parse(input), null, minify ? 0 : 2))
  } catch (error) {
    return fail(`JSON invalide : ${(error as Error).message}`)
  }
}

// Nombre → date (secondes si 10 chiffres ou moins, sinon millisecondes) ; texte → horodatage.
// Vide : maintenant.
export function time(input: string, now: Date): Result {
  const text = input.trim()
  const format = (d: Date): string =>
    `${d.toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'medium' })}\n${d.toISOString()}`
  if (!text) return ok(`${Math.floor(now.getTime() / 1000)}\n${format(now)}`)
  if (/^-?\d+$/.test(text)) {
    const n = Number(text)
    const date = new Date(text.replace('-', '').length <= 10 ? n * 1000 : n)
    return Number.isNaN(date.getTime()) ? fail('Horodatage hors limites') : ok(format(date))
  }
  const date = new Date(text)
  if (Number.isNaN(date.getTime())) return fail('Date illisible (ex. 2026-11-02 14:30)')
  return ok(`${Math.floor(date.getTime() / 1000)} s\n${date.getTime()} ms`)
}

export async function sha256(input: string): Promise<Result> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return ok([...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join(''))
}

// Entrée vide : rien à afficher (pas d'erreur rouge avant d'avoir tapé), sauf horodatage et UUID.
export async function run(tool: Tool, input: string, reverse: boolean): Promise<Result> {
  if (!input.trim() && tool !== 'time' && tool !== 'uuid') return ok('')
  if (tool === 'base64') return base64(input, reverse)
  if (tool === 'url') return url(input, reverse)
  if (tool === 'json') return json(input, reverse)
  if (tool === 'time') return time(input, new Date())
  if (tool === 'uuid') return ok(crypto.randomUUID())
  return sha256(input)
}
