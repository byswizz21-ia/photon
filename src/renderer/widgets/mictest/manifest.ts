// Widget « Test micro » : vumètre en direct, avis sur le niveau, enregistrement de 5 s à réécouter.
// Le micro ne s'ouvre que sur clic, et se ferme quand Photon se cache.
import MicrophoneIcon from 'phosphor-svelte/lib/MicrophoneIcon'
import type { WidgetManifest } from '../types'
import MicTest from './MicTest.svelte'

export type MicTestSettings = { device: string } // '' : micro par défaut de Windows

const manifest: WidgetManifest<MicTestSettings> = {
  name: 'Test micro',
  category: 'system',
  description: 'Vumètre en direct et enregistrement de 5 s pour vérifier son micro.',
  icon: MicrophoneIcon,
  size: { w: 3, h: 2, minW: 2, minH: 2 },
  defaults: { device: '' },
  component: MicTest
}

export default manifest
