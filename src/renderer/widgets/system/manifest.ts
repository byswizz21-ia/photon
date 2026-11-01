// Widget « Système » : charge CPU, RAM, GPU et températures, sans réglage.
import CpuIcon from 'phosphor-svelte/lib/CpuIcon'
import type { WidgetManifest } from '../types'
import System from './System.svelte'

export type SystemSettings = Record<string, never>

const manifest: WidgetManifest<SystemSettings> = {
  name: 'Système',
  icon: CpuIcon,
  size: { w: 3, h: 2, minW: 2, minH: 1 },
  defaults: {},
  component: System
}

export default manifest
