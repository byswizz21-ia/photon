// Corbeille (widget Corbeille), via l'outil natif trash.cs (src/main/native.ts) : lancé au premier
// usage, quelques ms par lecture.
import { spawn } from 'node:child_process'
import type { TrashState } from '../shared/api'
import { nativeTool } from './native'
import source from './trash.cs?raw'

const tool = nativeTool(source, 'Photon.Trash')
const EMPTY_WAIT_MS = 120_000 // des milliers de fichiers : Windows peut prendre du temps

async function ask(command: string, wait?: number): Promise<TrashState | null> {
  try {
    const raw = JSON.parse((await tool.send(command, wait)) ?? 'null') as Partial<TrashState> | null
    if (typeof raw?.count === 'number' && typeof raw.bytes === 'number') {
      return { count: raw.count, bytes: raw.bytes }
    }
    if (raw) console.warn('[photon] corbeille :', raw)
    return null
  } catch {
    return null
  }
}

export const trash = (): Promise<TrashState | null> => ask('state')
export const trashEmpty = (): Promise<TrashState | null> => ask('empty', EMPTY_WAIT_MS)

export function trashOpen(): void {
  spawn('explorer.exe', ['shell:RecycleBinFolder'], { detached: true, stdio: 'ignore' }).unref()
}
