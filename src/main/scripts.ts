// Widget Scripts : lance une commande choisie par l'utilisateur (npm run dev…) dans un dossier,
// garde la fin de sa sortie et l'arrête avec tous ses enfants. Les commandes tournent tant que
// Photon tourne, caché compris ; elles s'arrêtent quand Photon quitte.
import { spawn, type ChildProcess } from 'node:child_process'
import { stat } from 'node:fs/promises'
import { isAbsolute } from 'node:path'
import type { ScriptRun } from '../shared/api'

const MAX_OUTPUT = 8_000 // caractères gardés, la fin
const MAX_COMMAND = 1_000
const ID = /^[\w-]{1,40}$/
// Codes de couleur et de curseur des terminaux : illisibles en texte brut.
// eslint-disable-next-line no-control-regex -- ce sont justement ces caractères qu'on retire
const ANSI = /\x1b\[[0-?]*[ -/]*[@-~]|\x1b\][^\x07]*\x07/g

const runs = new Map<string, { run: ScriptRun; child: ChildProcess | null }>()

const idle = (id: string): ScriptRun => ({
  id,
  running: false,
  code: null,
  output: '',
  startedAt: null
})

// Variables d'Electron retirées : une app Electron lancée d'ici (Photon lui-même en dev…) les
// prendrait pour elle.
const cleanEnv = (): NodeJS.ProcessEnv => ({
  ...Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.startsWith('ELECTRON_'))
  ),
  FORCE_COLOR: '0',
  NO_COLOR: '1'
})

// Node, npm… écrivent en UTF-8 ; les outils de Windows (ping, dir…) dans la page de code OEM
// (850 en français). Morceau illisible en UTF-8 : relu en 850.
const CP850 =
  'ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜø£Ø×ƒáíóúñÑªº¿®¬½¼¡«»░▒▓│┤ÁÂÀ©╣║╗╝¢¥┐└┴┬├─┼ãÃ╚╔╩╦╠═╬¤ðÐÊËÈıÍÎÏ┘┌█▄¦Ì▀ÓßÔÒõÕµþÞÚÛÙýÝ¯´­±‗¾¶§÷¸°¨·¹³²■ '
const utf8 = new TextDecoder('utf-8', { fatal: true })

export function decode(chunk: Buffer): string {
  try {
    return utf8.decode(chunk)
  } catch {
    return [...chunk].map((b) => (b < 0x80 ? String.fromCharCode(b) : CP850[b - 0x80])).join('')
  }
}

export function scripts(ids: unknown): ScriptRun[] {
  if (!Array.isArray(ids)) return []
  return ids
    .filter((id): id is string => typeof id === 'string' && ID.test(id))
    .map((id) => ({ ...(runs.get(id)?.run ?? idle(id)) }))
}

export async function scriptStart(
  id: unknown,
  folder: unknown,
  command: unknown
): Promise<ScriptRun | null> {
  if (typeof id !== 'string' || !ID.test(id) || runs.get(id)?.child) return null
  if (typeof command !== 'string' || !command.trim() || command.length > MAX_COMMAND) return null
  if (typeof folder !== 'string' || !isAbsolute(folder)) return null
  const isFolder = (await stat(folder).catch(() => null))?.isDirectory() ?? false
  if (!isFolder) return null

  const run: ScriptRun = { id, running: true, code: null, output: '', startedAt: Date.now() }
  // shell : cmd.exe, comme dans un terminal (npm, &&, variables %X%).
  const child = spawn(command, { cwd: folder, shell: true, windowsHide: true, env: cleanEnv() })
  const entry = { run, child: child as ChildProcess | null }
  runs.set(id, entry)
  const append = (chunk: Buffer): void => {
    run.output = (run.output + decode(chunk).replace(ANSI, '')).slice(-MAX_OUTPUT)
  }
  child.stdout.on('data', append)
  child.stderr.on('data', append)
  const finish = (code: number | null): void => {
    if (entry.child !== child) return
    entry.child = null
    run.running = false
    run.code = code ?? -1
  }
  child.on('exit', finish)
  child.on('error', (error) => {
    append(Buffer.from(`\n${error.message}\n`))
    finish(-1)
  })
  return { ...run }
}

// taskkill /T : le processus et tous ses enfants (npm → node → serveur…).
function kill(pid: number): Promise<void> {
  return new Promise((resolve) => {
    const killer = spawn('taskkill.exe', ['/pid', String(pid), '/T', '/F'], { windowsHide: true })
    killer.on('exit', () => resolve())
    killer.on('error', () => resolve())
  })
}

export async function scriptStop(id: unknown): Promise<void> {
  const pid = typeof id === 'string' ? runs.get(id)?.child?.pid : undefined
  if (pid) await kill(pid)
}

// Photon quitte : rien ne doit lui survivre.
export function stopScripts(): Promise<void> {
  const pids = [...runs.values()]
    .map((entry) => entry.child?.pid)
    .filter((pid) => pid !== undefined)
  return Promise.all(pids.map(kill)).then(() => undefined)
}
