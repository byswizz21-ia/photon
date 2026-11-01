// Barre Claude : Claude Code (claude -p) lancé côté Windows, réponse lue mot par mot (stream-json).
// Mode Question : outils de lecture seulement (Read, Glob, Grep), Claude ne modifie et ne lance rien.
// Réglages perso de Claude Code ignorés (hooks, MCP) : réponses neutres et ~1 s de démarrage en moins.
import { app } from 'electron'
import { spawn, type ChildProcess } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync, promises as fs } from 'node:fs'
import { homedir } from 'node:os'
import { basename, isAbsolute, join } from 'node:path'
import { createInterface } from 'node:readline'
import type { ClaudeMessage, ClaudeState, Conversation } from '../shared/api'
import { readJson, writeJson } from './store'
import { send } from './window'

const EXE = join(homedir(), '.local', 'bin', 'claude.exe') // installateur officiel Windows
const TOOLS = 'Read,Glob,Grep'
const SYSTEM_PROMPT =
  "Tu réponds dans Photon, un panneau de widgets sur le bureau Windows de l'utilisateur. " +
  'Réponds en français, de façon concise, en Markdown simple. ' +
  'Tu peux lire les fichiers donnés mais tu ne modifies et ne lances rien.'
const MAX_CONVERSATIONS = 30
const MAX_FILES = 10
const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const PUSH_MS = 50 // envoi de l'état à l'interface au plus toutes les 50 ms pendant une réponse

const folder = (): string => join(app.getPath('userData'), 'claude')
const historyFile = (): string => join(folder(), 'conversations.json')

const blank = (): Conversation => ({
  id: randomUUID(),
  title: '',
  updatedAt: Date.now(),
  started: false,
  messages: []
})

let history: Conversation[] = [] // conversations avec au moins une question, récentes d'abord
let current = blank()
let child: ChildProcess | null = null
let pushTimer: NodeJS.Timeout | null = null
let stop = (): void => {} // interrompt la réponse en cours

export function claudeState(): ClaudeState {
  return {
    available: existsSync(EXE),
    busy: child !== null,
    current,
    history: history.map(({ id, title, updatedAt }) => ({ id, title, updatedAt }))
  }
}

// Pendant une réponse, plusieurs morceaux par envoi ; `now` pour les changements d'état.
function push(now = false): void {
  if (now) {
    if (pushTimer) clearTimeout(pushTimer)
    pushTimer = null
    send('photon:claude', claudeState())
    return
  }
  pushTimer ??= setTimeout(() => push(true), PUSH_MS)
}

// --- Conversations enregistrées ---

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback)

function parseMessage(v: unknown): ClaudeMessage | null {
  if (!isObject(v) || (v.role !== 'user' && v.role !== 'assistant')) return null
  const message: ClaudeMessage = { role: v.role, text: str(v.text) }
  if (Array.isArray(v.files)) message.files = v.files.filter((f) => typeof f === 'string')
  if (typeof v.error === 'string') message.error = v.error
  return message
}

function parseConversation(v: unknown): Conversation | null {
  if (!isObject(v) || typeof v.id !== 'string' || !Array.isArray(v.messages)) return null
  return {
    id: v.id,
    title: str(v.title),
    updatedAt: typeof v.updatedAt === 'number' ? v.updatedAt : 0,
    started: v.started === true,
    messages: v.messages.map(parseMessage).filter((m) => m !== null)
  }
}

function parseHistory(raw: unknown): Conversation[] {
  if (!Array.isArray(raw)) throw new Error('JSON invalide : liste attendue')
  return raw.map(parseConversation).filter((c) => c !== null)
}

export async function loadClaude(): Promise<void> {
  history = await readJson(historyFile(), parseHistory, () => [])
  app.on('will-quit', () => child?.kill())
}

function save(): void {
  history = [current, ...history.filter((c) => c.id !== current.id)].slice(0, MAX_CONVERSATIONS)
  void writeJson(historyFile(), history, parseHistory)
}

export function newConversation(): void {
  if (child) return
  current = blank()
  push(true)
}

export function openConversation(id: unknown): void {
  const found = history.find((c) => c.id === id)
  if (child || !found) return
  current = found
  push(true)
}

// --- Question ---

// Fichiers joints : chemins locaux existants seulement (pas de chemin réseau \\serveur).
export function validFiles(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((p): p is string => typeof p === 'string' && isAbsolute(p) && !p.startsWith('\\\\'))
    .filter((p) => existsSync(p))
    .slice(0, MAX_FILES)
}

// Ce que fait Claude pendant qu'il n'écrit pas encore.
function activity(tool: string, input: Record<string, unknown>): string {
  if (tool === 'Read' && typeof input.file_path === 'string') {
    return `Lecture de ${basename(input.file_path)}…`
  }
  return tool === 'Read' ? 'Lecture…' : 'Recherche dans les fichiers…'
}

export function ask(text: string, files: string[]): boolean {
  if (child || !existsSync(EXE) || !text.trim()) return false
  const conversation = current
  const answer: ClaudeMessage = { role: 'assistant', text: '', status: 'Réflexion…' }
  conversation.messages.push({ role: 'user', text, ...(files.length ? { files } : {}) }, answer)
  conversation.title ||= text.trim().replace(/\s+/g, ' ').slice(0, 60)
  conversation.updatedAt = Date.now()
  save()

  const prompt = files.length
    ? `${text}\n\nFichiers joints :\n${files.map((f) => `- ${f}`).join('\n')}`
    : text
  const args = [
    '-p',
    '--output-format',
    'stream-json',
    '--verbose',
    '--include-partial-messages',
    '--strict-mcp-config',
    '--setting-sources',
    '',
    '--tools',
    TOOLS,
    '--allowedTools',
    TOOLS,
    '--append-system-prompt',
    SYSTEM_PROMPT,
    ...(conversation.started ? ['--resume', conversation.id] : ['--session-id', conversation.id])
  ]

  let stopped = false
  let stderr = ''
  const proc = spawn(EXE, args, { cwd: app.getPath('userData'), windowsHide: true })
  child = proc
  proc.stdin.end(prompt) // par l'entrée standard : pas de limite de longueur ni de souci de guillemets

  createInterface({ input: proc.stdout }).on('line', (line) => {
    let event: Record<string, unknown>
    try {
      event = JSON.parse(line) as Record<string, unknown>
    } catch {
      return
    }
    onEvent(conversation, answer, event)
  })
  proc.stderr.on('data', (chunk) => (stderr = (stderr + String(chunk)).slice(-500)))
  proc.on('error', (error) => (answer.error = `Claude Code introuvable (${error.message})`))
  proc.on('close', (code) => {
    child = null
    delete answer.status
    if (stopped) answer.error = 'Réponse interrompue'
    else if (code !== 0 && !answer.error) {
      answer.error = stderr.trim().split('\n').at(-1) || `Claude Code arrêté (code ${code})`
    }
    conversation.updatedAt = Date.now()
    save()
    push(true)
  })
  stop = () => {
    stopped = true
    proc.kill()
  }
  push(true)
  return true
}

export function stopAnswer(): void {
  if (child) stop()
}

function onEvent(
  conversation: Conversation,
  answer: ClaudeMessage,
  event: Record<string, unknown>
): void {
  if (event.type === 'system' && event.subtype === 'init') {
    conversation.started = true
    return
  }
  if (event.type === 'stream_event' && isObject(event.event)) {
    const inner = event.event
    // Nouveau bloc de texte après un outil : on saute une ligne.
    if (inner.type === 'content_block_start' && answer.text && !answer.text.endsWith('\n\n')) {
      if (isObject(inner.content_block) && inner.content_block.type === 'text') {
        answer.text += '\n\n'
      }
    }
    if (
      inner.type === 'content_block_delta' &&
      isObject(inner.delta) &&
      inner.delta.type === 'text_delta'
    ) {
      answer.text += str(inner.delta.text)
      delete answer.status
      push()
    }
    return
  }
  if (
    event.type === 'assistant' &&
    isObject(event.message) &&
    Array.isArray(event.message.content)
  ) {
    for (const block of event.message.content) {
      if (isObject(block) && block.type === 'tool_use') {
        answer.status = activity(str(block.name), isObject(block.input) ? block.input : {})
        push()
      }
    }
    return
  }
  if (event.type === 'result') {
    if (event.is_error === true) answer.error = str(event.result, 'Erreur de Claude Code')
    else if (!answer.text) answer.text = str(event.result)
  }
}

// --- Capture collée ---

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47]

// Capture d'écran collée dans le champ : fichier PNG temporaire que Claude pourra lire.
export async function saveImage(raw: unknown): Promise<string | null> {
  if (!(raw instanceof Uint8Array) || raw.length > MAX_IMAGE_BYTES) return null
  if (!PNG_SIGNATURE.every((byte, i) => raw[i] === byte)) return null
  const dir = join(app.getPath('temp'), 'photon-claude')
  await fs.mkdir(dir, { recursive: true })
  const path = join(dir, `capture-${Date.now()}.png`)
  await fs.writeFile(path, raw)
  return path
}
