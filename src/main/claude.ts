// Barre Claude : Claude Code (claude -p) lancé côté Windows, réponse lue mot par mot (stream-json).
// Modes : Question = lecture seule (Read, Glob, Grep) ; Agent = agit sur le PC, chaque action
// demandée à l'utilisateur (Claude Code envoie can_use_tool, Photon répond) ; Bypass = agit sans
// demander, activé exprès et rendu au mode Question dès que Photon se cache.
// Réglages perso de Claude Code ignorés (hooks, MCP) : réponses neutres et ~1 s de démarrage en moins.
import { app } from 'electron'
import { spawn, type ChildProcess } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync, promises as fs } from 'node:fs'
import { homedir } from 'node:os'
import { basename, isAbsolute, join } from 'node:path'
import { createInterface } from 'node:readline'
import type {
  ClaudeApproval,
  ClaudeMessage,
  ClaudeMode,
  ClaudeState,
  Conversation
} from '../shared/api'
import { notify } from './notify'
import { describeAction } from './permission'
import { readJson, writeJson } from './store'
import { isVisible, send, showWindow } from './window'

const EXE = join(homedir(), '.local', 'bin', 'claude.exe') // installateur officiel Windows
const READ_TOOLS = 'Read,Glob,Grep' // jamais demandés : sans effet sur le PC
const AGENT_TOOLS = `${READ_TOOLS},Edit,Write,Bash,PowerShell,WebFetch,WebSearch`
const BASE_PROMPT =
  "Tu réponds dans Photon, un panneau de widgets sur le bureau Windows de l'utilisateur. " +
  'Réponds en français, de façon concise, en Markdown simple. ' +
  'Écris en français la description de chaque commande que tu lances. '
const MODE_PROMPTS: Record<ClaudeMode, string> = {
  question: 'Tu peux lire les fichiers donnés mais tu ne modifies et ne lances rien.',
  agent:
    "Tu peux agir sur le PC (fichiers, commandes PowerShell) : chaque action est soumise à l'accord " +
    "de l'utilisateur, qui peut refuser.",
  bypass:
    'Tu peux agir sur le PC (fichiers, commandes PowerShell) sans confirmation. Sois prudent : rien ' +
    "d'irréversible (suppression, formatage, désinstallation) sans demande explicite."
}
const MODES: readonly string[] = ['question', 'agent', 'bypass']
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
let mode: ClaudeMode = 'question' // jamais enregistré : Photon redémarre en mode Question
// Actions en attente d'accord (Claude peut en demander plusieurs à la fois), la première affichée.
let approvals: ClaudeApproval[] = []
let reply: (id: string, allow: boolean) => void = () => {}

export function claudeState(): ClaudeState {
  return {
    available: existsSync(EXE),
    busy: child !== null,
    mode,
    approval: approvals[0] ?? null,
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
  const file = typeof input.file_path === 'string' ? basename(input.file_path) : ''
  if (tool === 'Read') return file ? `Lecture de ${file}…` : 'Lecture…'
  if (tool === 'Edit' || tool === 'Write') return file ? `Écriture de ${file}…` : 'Écriture…'
  if (tool === 'Bash' || tool === 'PowerShell') return 'Commande en cours…'
  if (tool.startsWith('Web')) return 'Recherche sur le web…'
  return 'Recherche dans les fichiers…'
}

export function setMode(raw: unknown): void {
  if (typeof raw !== 'string' || !MODES.includes(raw)) return
  mode = raw as ClaudeMode
  push(true)
}

// Photon caché : le mode Bypass ne survit pas (une réponse déjà lancée garde ses droits).
export function leaveBypass(): void {
  if (mode !== 'bypass') return
  mode = 'question'
  push(true)
}

export function answerApproval(id: unknown, allow: unknown): void {
  if (typeof id === 'string' && approvals.some((a) => a.id === id)) reply(id, allow === true)
}

export function ask(text: string, files: string[]): boolean {
  if (child || !existsSync(EXE) || !text.trim()) return false
  const conversation = current
  const runMode = mode
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
    '--input-format',
    'stream-json',
    '--output-format',
    'stream-json',
    '--verbose',
    '--include-partial-messages',
    '--strict-mcp-config',
    '--setting-sources',
    '',
    '--tools',
    runMode === 'question' ? READ_TOOLS : AGENT_TOOLS,
    '--allowedTools',
    READ_TOOLS,
    // stdio : Claude Code demande chaque autre action à Photon (control_request can_use_tool).
    ...(runMode === 'bypass'
      ? ['--permission-mode', 'bypassPermissions']
      : ['--permission-prompt-tool', 'stdio']),
    '--append-system-prompt',
    BASE_PROMPT + MODE_PROMPTS[runMode],
    ...(conversation.started ? ['--resume', conversation.id] : ['--session-id', conversation.id])
  ]

  let stopped = false
  let stderr = ''
  // Question : dossier de Photon ; Agent et Bypass travaillent depuis le dossier de l'utilisateur.
  const cwd = runMode === 'question' ? app.getPath('userData') : homedir()
  const proc = spawn(EXE, args, { cwd, windowsHide: true })
  child = proc
  const write = (message: unknown): void => void proc.stdin.write(`${JSON.stringify(message)}\n`)
  proc.stdin.on('error', () => {}) // processus déjà fini : rien à répondre
  // Par l'entrée standard : pas de limite de longueur ni de souci de guillemets.
  write({ type: 'user', message: { role: 'user', content: prompt } })

  const inputs = new Map<string, Record<string, unknown>>() // paramètres des actions en attente
  reply = (id, allow) => {
    const pending = inputs.get(id)
    inputs.delete(id)
    approvals = approvals.filter((a) => a.id !== id)
    const response = allow
      ? { behavior: 'allow', updatedInput: pending ?? {} }
      : { behavior: 'deny', message: "L'utilisateur a refusé cette action." }
    write({ type: 'control_response', response: { subtype: 'success', request_id: id, response } })
    answer.status = approvals.length ? 'En attente de ton accord…' : 'Action en cours…'
    push(true)
  }

  createInterface({ input: proc.stdout }).on('line', (line) => {
    let event: Record<string, unknown>
    try {
      event = JSON.parse(line) as Record<string, unknown>
    } catch {
      return
    }
    if (event.type === 'result') proc.stdin.end() // fin de la réponse : Claude Code peut s'arrêter
    if (
      event.type === 'control_request' &&
      isObject(event.request) &&
      event.request.subtype === 'can_use_tool'
    ) {
      const id = str(event.request_id)
      const input = isObject(event.request.input) ? event.request.input : {}
      inputs.set(id, input)
      // Mode Question : aucune action possible, même si Claude en demande une.
      if (runMode === 'question') {
        reply(id, false)
        return
      }
      approvals = [...approvals, { id, ...describeAction(str(event.request.tool_name), input) }]
      answer.status = 'En attente de ton accord…'
      push(true)
      notifyApproval()
      return
    }
    onEvent(conversation, answer, event)
  })
  proc.stderr.on('data', (chunk) => (stderr = (stderr + String(chunk)).slice(-500)))
  proc.on('error', (error) => (answer.error = `Claude Code introuvable (${error.message})`))
  proc.on('close', (code) => {
    child = null
    approvals = []
    reply = () => {}
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

// Photon caché pendant une demande d'accord : notification Windows qui le rouvre.
function notifyApproval(): void {
  if (isVisible()) return
  notify({ title: 'Claude attend ton accord', body: approvals[0]?.title ?? '' }, showWindow)
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
