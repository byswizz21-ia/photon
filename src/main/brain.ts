// Widget Cerveau : une demande ponctuelle à Claude Code (claude -p), réponse en JSON validé par
// le schéma que donne le widget (--json-schema). Sans outils, sans MCP, sans réglages perso et
// sans session gardée : rien ne touche au PC ni à l'historique de la barre Claude.
import { app } from 'electron'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { BrainReply } from '../shared/api'

const EXE = join(homedir(), '.local', 'bin', 'claude.exe')
const MODEL = 'sonnet' // rapide (≈ 7 s) et assez fin pour des cartes, problèmes et corrections
const MAX_PROMPT = 30_000
const MAX_SCHEMA = 10_000
const MAX_RUNNING = 2
const TIMEOUT_MS = 120_000
const SYSTEM =
  'Tu es le moteur pédagogique de Cerveau, un coach pour apprendre et raisonner mieux. ' +
  'Tu écris en français, tutoies, restes exact (aucun fait inventé) et concret. ' +
  'Tu réponds uniquement avec la sortie structurée demandée.'

let running = 0

const fail = (error: string): BrainReply => ({ value: null, error })

// Sortie de claude -p --output-format json : un objet « result » ; structured_output = réponse.
export function readResult(stdout: string): BrainReply {
  let json: unknown
  try {
    json = JSON.parse(stdout)
  } catch {
    return fail('Réponse illisible de Claude Code')
  }
  if (typeof json !== 'object' || json === null) return fail('Réponse vide de Claude Code')
  const result = json as Record<string, unknown>
  if (result.is_error === true) {
    return fail(typeof result.result === 'string' ? result.result : 'Erreur de Claude Code')
  }
  if (result.structured_output === undefined) return fail('Réponse sans contenu structuré')
  return { value: result.structured_output, error: null }
}

export function brainAsk(prompt: unknown, schema: unknown): Promise<BrainReply> {
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > MAX_PROMPT) {
    return Promise.resolve(fail('Demande vide ou trop longue'))
  }
  const schemaText = typeof schema === 'object' && schema !== null ? JSON.stringify(schema) : ''
  if (!schemaText || schemaText.length > MAX_SCHEMA) return Promise.resolve(fail('Schéma invalide'))
  if (!existsSync(EXE)) return Promise.resolve(fail('Claude Code introuvable sur ce PC'))
  if (running >= MAX_RUNNING) return Promise.resolve(fail('Déjà deux demandes en cours'))

  running++
  return new Promise((resolve) => {
    const args = [
      '-p',
      '--output-format',
      'json',
      '--tools',
      '',
      '--strict-mcp-config',
      '--setting-sources',
      '',
      '--no-session-persistence',
      '--model',
      MODEL,
      '--system-prompt',
      SYSTEM,
      '--json-schema',
      schemaText
    ]
    const proc = spawn(EXE, args, { cwd: app.getPath('userData'), windowsHide: true })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => proc.kill(), TIMEOUT_MS)
    proc.stdout.on('data', (chunk) => (stdout += String(chunk)))
    proc.stderr.on('data', (chunk) => (stderr = (stderr + String(chunk)).slice(-300)))
    proc.stdin.on('error', () => {})
    proc.stdin.end(prompt) // par l'entrée standard : ni limite de longueur ni guillemets
    let done = false
    const finish = (reply: BrainReply): void => {
      if (done) return
      done = true
      clearTimeout(timer)
      running--
      resolve(reply)
    }
    proc.on('error', (error) => finish(fail(`Claude Code introuvable (${error.message})`)))
    proc.on('close', (code) => {
      if (stdout.trim()) finish(readResult(stdout))
      else finish(fail(stderr.trim().split('\n').at(-1) || `Claude Code arrêté (code ${code})`))
    })
  })
}
