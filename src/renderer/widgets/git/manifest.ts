// Widget « Projets Git » : branche, fichiers modifiés et commits non poussés de dépôts choisis.
import GitBranchIcon from 'phosphor-svelte/lib/GitBranchIcon'
import type { WidgetManifest } from '../types'
import Git from './Git.svelte'

export type GitSettings = { folders: string[] }

const manifest: WidgetManifest<GitSettings> = {
  name: 'Projets Git',
  icon: GitBranchIcon,
  size: { w: 4, h: 3, minW: 2, minH: 1 },
  defaults: { folders: [] },
  component: Git
}

export default manifest
