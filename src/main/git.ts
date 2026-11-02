// Projets Git (widget Projets Git) : état des dépôts choisis, lu par git.exe (≈ 50 ms par dépôt).
// Aucun appel réseau : « en avance / en retard » compare au dernier fetch fait par l'utilisateur.
// GIT_OPTIONAL_LOCKS=0 : git status ne verrouille pas l'index (pas de conflit avec un commit en
// cours). Un dépôt récupéré d'ailleurs ne doit pas faire lancer de programme à Photon : fsmonitor,
// signatures (gpg.program), sous-modules et filtres de son .git/config sont coupés (sauf Git LFS).
import { shell } from 'electron'
import { execFile } from 'node:child_process'
import { stat } from 'node:fs/promises'
import { basename, isAbsolute } from 'node:path'
import type { GitRepo } from '../shared/api'

const MAX_REPOS = 12
const TIMEOUT_MS = 5000

type Run = { out: string } | { error: 'missing' | 'failed' }

function git(cwd: string, args: string[]): Promise<Run> {
  return new Promise((resolve) => {
    execFile(
      'git',
      ['-C', cwd, '-c', 'core.fsmonitor=false', '-c', 'log.showSignature=false', ...args],
      {
        windowsHide: true,
        timeout: TIMEOUT_MS,
        maxBuffer: 4 * 1024 * 1024,
        env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' }
      },
      (error, stdout) => {
        if (!error) resolve({ out: stdout })
        else
          resolve({ error: (error as { code?: unknown }).code === 'ENOENT' ? 'missing' : 'failed' })
      }
    )
  })
}

export type Status = Pick<
  GitRepo,
  'branch' | 'upstream' | 'ahead' | 'behind' | 'changed' | 'untracked'
>

// Sortie de `git status --porcelain=v2 --branch`.
export function parseStatus(out: string): Status {
  const status: Status = {
    branch: '',
    upstream: false,
    ahead: 0,
    behind: 0,
    changed: 0,
    untracked: 0
  }
  for (const line of out.split('\n')) {
    if (line.startsWith('# branch.head ')) {
      const head = line.slice(14)
      status.branch = head === '(detached)' ? 'HEAD détachée' : head
    } else if (line.startsWith('# branch.upstream ')) status.upstream = true
    else if (line.startsWith('# branch.ab ')) {
      const match = /^# branch\.ab \+(\d+) -(\d+)/.exec(line)
      if (match) [status.ahead, status.behind] = [Number(match[1]), Number(match[2])]
    } else if (/^[12u] /.test(line)) status.changed++
    else if (line.startsWith('? ')) status.untracked++
  }
  return status
}

const isLocalPath = (v: unknown): v is string =>
  typeof v === 'string' && v.length < 1000 && isAbsolute(v) && !v.startsWith('\\\\')

// Filtres déclarés par le dépôt (filter.<nom>.clean…) : git status peut les lancer. Remis à vide,
// git les ignore. Git LFS, courant et sûr, est gardé.
export function filterOverrides(out: string): string[] {
  return out.split('\n').flatMap((line) => {
    const [key = '', ...value] = line.trim().split(' ')
    if (!/^filter\.[^\s=]+\.(clean|smudge|process|required)$/i.test(key)) return []
    if (/^git[- ]lfs /.test(value.join(' '))) return []
    return ['-c', key.endsWith('.required') ? `${key}=false` : `${key}=`]
  })
}

async function isFolder(path: string): Promise<boolean> {
  return stat(path).then(
    (s) => s.isDirectory(),
    () => false
  )
}

async function repo(path: string): Promise<GitRepo> {
  const base: GitRepo = {
    path,
    name: basename(path) || path,
    branch: '',
    upstream: false,
    ahead: 0,
    behind: 0,
    changed: 0,
    untracked: 0,
    commit: null,
    error: null
  }
  if (!(await isFolder(path))) return { ...base, error: 'Dossier introuvable' }
  const filters = await git(path, ['config', '--get-regexp', '^filter\\.'])
  const safe = 'out' in filters ? filterOverrides(filters.out) : []
  const [status, log] = await Promise.all([
    git(path, [...safe, 'status', '--porcelain=v2', '--branch', '--ignore-submodules=all']),
    git(path, ['log', '-1', '--no-show-signature', '--format=%s%x00%ct'])
  ])
  if ('error' in status) {
    return { ...base, error: status.error === 'missing' ? 'Git introuvable' : 'Pas un dépôt Git' }
  }
  const [subject, time] = 'out' in log ? log.out.trim().split('\0') : []
  const commit = subject && time ? { subject, at: Number(time) * 1000 } : null
  return { ...base, ...parseStatus(status.out), commit }
}

// Dossiers absolus et locaux seulement (aucun lecteur réseau), dans l'ordre du widget.
export async function gitStatus(paths: unknown): Promise<GitRepo[]> {
  if (!Array.isArray(paths)) return []
  return Promise.all(paths.filter(isLocalPath).slice(0, MAX_REPOS).map(repo))
}

// Ouvre le dossier dans VS Code (lien vscode://, sans passer par un shell).
export async function gitOpen(path: unknown): Promise<boolean> {
  if (!isLocalPath(path) || !(await isFolder(path))) return false
  const [drive, ...rest] = path.split(/[\\/]+/).filter(Boolean)
  const url = `vscode://file/${[drive, ...rest.map(encodeURIComponent)].join('/')}`
  return shell.openExternal(url).then(
    () => true,
    () => false
  )
}
