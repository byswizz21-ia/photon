// Widget « Dossiers » : dossiers favoris (choisis ou glissés) et derniers fichiers ouverts dans Windows.
import FolderOpenIcon from 'phosphor-svelte/lib/FolderOpenIcon'
import type { WidgetManifest } from '../types'
import Folders from './Folders.svelte'

export type FoldersSettings = { folders: string[] }

const manifest: WidgetManifest<FoldersSettings> = {
  name: 'Dossiers',
  icon: FolderOpenIcon,
  size: { w: 4, h: 3, minW: 2, minH: 2 },
  defaults: { folders: [] },
  component: Folders
}

export default manifest
