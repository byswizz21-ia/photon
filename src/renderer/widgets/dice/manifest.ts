// Widget « Tirage au sort » : dés, pile ou face, nom au hasard dans une liste, nombre au hasard.
import DiceFiveIcon from 'phosphor-svelte/lib/DiceFiveIcon'
import type { WidgetManifest } from '../types'
import Dice from './Dice.svelte'

export type DiceMode = 'dice' | 'coin' | 'list' | 'number'

export type DiceSettings = {
  mode: DiceMode
  count: number // dés lancés
  faces: number // faces par dé
  list: string // un nom par ligne
  unique: boolean // liste : sans remise (chacun sort une fois)
  min: number
  max: number
}

const manifest: WidgetManifest<DiceSettings> = {
  name: 'Tirage au sort',
  category: 'tools',
  description: 'Dés, pile ou face, un nom dans une liste ou un nombre au hasard.',
  icon: DiceFiveIcon,
  size: { w: 3, h: 3, minW: 2, minH: 2 },
  defaults: { mode: 'dice', count: 1, faces: 6, list: '', unique: false, min: 1, max: 100 },
  component: Dice
}

export default manifest
