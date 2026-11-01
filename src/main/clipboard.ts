// Historique du presse-papiers (widget Presse-papiers) : textes copiés gardés en mémoire seulement,
// jamais sur le disque. Surveillé (une lecture par seconde) seulement si le profil actif a le
// widget : c'est la seule façon de voir les copies faites Photon caché.
// Ignore les copies marquées privées par les gestionnaires de mots de passe (KeePass, Bitwarden…).
import { clipboard } from 'electron'
import { data } from './data'

const MAX_ITEMS = 30
const MAX_CHARS = 20_000
const CHECK_MS = 1_000

let history: string[] = []
let last = ''
let timer: NodeJS.Timeout | undefined

// Formats Windows posés par les gestionnaires de mots de passe : « ne pas surveiller » et
// « ne pas garder dans l'historique » (présent = copie privée).
const PRIVATE = ['ExcludeClipboardContentFromMonitorProcessing', 'CanIncludeInClipboardHistory']
const raw = (format: string): string => `electron application/osclipboard;format="${format}"`

async function isPrivate(): Promise<boolean> {
  const found = await Promise.all(PRIVATE.map((format) => clipboard.has(raw(format))))
  return found.some(Boolean)
}

let busy = false

async function check(): Promise<void> {
  if (busy) return
  busy = true
  try {
    const text = await clipboard.readText()
    if (text === last) return
    last = text
    if (!text.trim() || text.length > MAX_CHARS || (await isPrivate())) return
    history = [text, ...history.filter((t) => t !== text)].slice(0, MAX_ITEMS)
  } catch (error) {
    console.warn('[photon] presse-papiers illisible :', error)
  } finally {
    busy = false
  }
}

// Démarrage et chaque changement de profil : surveille seulement si un widget l'affiche.
export function syncClipboard(): void {
  const wanted = data.profile.widgets.some((widget) => widget.type === 'clipboard')
  if (wanted && !timer) {
    void check()
    timer = setInterval(() => void check(), CHECK_MS)
  } else if (!wanted && timer) {
    clearInterval(timer)
    timer = undefined
    history = []
    last = ''
  }
}

export const clipboardHistory = (): string[] => history

export function clipboardClear(): void {
  history = []
}
