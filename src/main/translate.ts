// Widget Traduction : DeepL si l'utilisateur a mis sa clé (gratuite, 500 000 caractères par mois),
// sinon MyMemory (sans clé, 500 octets par demande, ≈ 450 caractères accentués). Appel seulement sur demande.
import type { Translation } from '../shared/api'
import { arr, getJson, obj, str } from './web'

const MAX_FREE = 500 // octets
const MAX_TEXT = 5_000
const LANG = /^[a-z]{2}$/

const fail = (error: string): Translation => ({ text: '', from: '', error })

async function deepl(text: string, to: string, key: string): Promise<Translation> {
  // Clé gratuite (fin « :fx ») : serveur api-free.
  const host = key.endsWith(':fx') ? 'api-free.deepl.com' : 'api.deepl.com'
  const json = obj(
    await getJson(`https://${host}/v2/translate`, {
      method: 'POST',
      headers: { Authorization: `DeepL-Auth-Key ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: [text], target_lang: to.toUpperCase() })
    })
  )
  const first = obj(arr(json['translations'])[0])
  return {
    text: str(first['text']),
    from: str(first['detected_source_language']).toLowerCase(),
    error: null
  }
}

async function myMemory(text: string, to: string): Promise<Translation> {
  const url = `https://api.mymemory.translated.net/get?langpair=autodetect|${to}&q=${encodeURIComponent(text)}`
  const json = obj(await getJson(url))
  if (json['quotaFinished'] === true) return fail('Quota du jour atteint : ajoute une clé DeepL')
  const answer = obj(json['responseData'])
  const translated = str(answer['translatedText'])
  if (json['responseStatus'] !== 200 || !translated) return fail('Traduction impossible')
  return { text: translated, from: str(answer['detectedLanguage']).toLowerCase(), error: null }
}

export async function translate(text: unknown, to: unknown, key: unknown): Promise<Translation> {
  if (typeof text !== 'string' || !text.trim()) return fail('Rien à traduire')
  if (typeof to !== 'string' || !LANG.test(to)) return fail('Langue inconnue')
  const deeplKey = typeof key === 'string' ? key.trim().slice(0, 100) : ''
  const tooLong = deeplKey ? text.length > MAX_TEXT : Buffer.byteLength(text) > MAX_FREE
  if (tooLong) return fail(deeplKey ? 'Texte trop long' : 'Trop long sans clé DeepL (≈ 450 caractères)')
  try {
    return deeplKey ? await deepl(text, to, deeplKey) : await myMemory(text, to)
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message.includes('403')) return fail('Clé DeepL refusée')
    if (message.includes('456')) return fail('Quota DeepL du mois atteint')
    return fail('Hors ligne')
  }
}
