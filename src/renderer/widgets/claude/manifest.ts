// Barre Claude : poser une question à Claude (Claude Code côté Windows), réponse mot par mot.
import SparkleIcon from 'phosphor-svelte/lib/SparkleIcon'
import type { WidgetManifest } from '../types'
import Claude from './Claude.svelte'

export type ClaudeSettings = Record<string, never>

const manifest: WidgetManifest<ClaudeSettings> = {
  name: 'Claude',
  icon: SparkleIcon,
  size: { w: 5, h: 5, minW: 4, minH: 4 },
  defaults: {},
  component: Claude
}

export default manifest
