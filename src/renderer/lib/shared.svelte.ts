// Données partagées entre profils (notes, to-do…), gardées par Photon dans data/<clé>.json.
// Un seul objet par clé dans l'interface : deux widgets de même clé restent synchronisés.
// À utiliser : const notes = shared('notes', parse) ; notes.value… ; notes.save() après un changement.
// Widget « propre au profil » (design doc) : $derived(shared(profileKey('notes', own), parse)).
import { app } from '../state.svelte'

const SAVE_DELAY = 400

export class Shared<T> {
  value: T = $state() as T
  ready = $state(false) // valeur lue sur le disque
  #timer: ReturnType<typeof setTimeout> | undefined

  constructor(
    readonly key: string,
    parse: (raw: unknown) => T
  ) {
    this.value = parse(null)
    void window.photon.sharedLoad(key).then((raw) => {
      this.value = parse(raw)
      this.ready = true
    })
  }

  // Une écriture par rafale (frappe au clavier).
  save(): void {
    clearTimeout(this.#timer)
    this.#timer = setTimeout(() => this.flush(), SAVE_DELAY)
  }

  flush(): void {
    if (this.#timer === undefined) return
    clearTimeout(this.#timer)
    this.#timer = undefined
    void window.photon.sharedSave(this.key, $state.snapshot(this.value))
  }
}

// Registre interne, jamais affiché : pas besoin d'une Map réactive.
// eslint-disable-next-line svelte/prefer-svelte-reactivity
const stores = new Map<string, Shared<unknown>>()

export function shared<T>(key: string, parse: (raw: unknown) => T): Shared<T> {
  let store = stores.get(key)
  if (!store) {
    store = new Shared(key, parse)
    stores.set(key, store)
  }
  return store as Shared<T>
}

// Réglage « propre au profil » : clé suffixée par l'id du profil actif (data/notes-<id>.json).
export const profileKey = (key: string, own: boolean): string =>
  own ? `${key}-${app.settings.activeProfile}` : key

// Fermeture de Photon : écrit tout de suite ce qui attend.
export function flushShared(): void {
  for (const store of stores.values()) store.flush()
}
