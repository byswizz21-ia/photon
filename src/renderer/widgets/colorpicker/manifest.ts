// Widget « Pipette » : prendre une couleur n'importe où sur ses écrans (Photon se cache le temps
// du clic, src/main/colorpicker.ts), la copier en HEX, RGB ou HSL, retrouver les dernières.
import EyedropperIcon from 'phosphor-svelte/lib/EyedropperIcon'
import type { WidgetManifest } from '../types'
import ColorPicker from './ColorPicker.svelte'

export type ColorPickerSettings = { colors: string[] } // « #rrggbb », la plus récente d'abord

const manifest: WidgetManifest<ColorPickerSettings> = {
  name: 'Pipette',
  category: 'tools',
  description: "Prend une couleur n'importe où sur l'écran et la copie.",
  icon: EyedropperIcon,
  size: { w: 3, h: 3, minW: 2, minH: 2 },
  defaults: { colors: [] },
  component: ColorPicker
}

export default manifest
