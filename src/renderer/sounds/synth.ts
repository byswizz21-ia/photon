// Ambiances synthétisées (Web Audio) : chaque son est une liste de notes et un souffle.
// Accordées en do majeur. Sons fréquents (clics) très courts et discrets, ouverture et
// notification un peu plus présentes, comme le recommandent les guides de sound design d'UI.
import type { SoundPreset } from '../../shared/model'

// Note : fréquence (Hz), glissée vers `to`, départ décalé de `at` s, durée, volume relatif.
export type Tone = {
  f: number
  to?: number
  at?: number
  dur: number
  gain?: number
  wave?: OscillatorType
}
// Souffle : bruit filtré dont la hauteur glisse de `from` à `to` (Hz) ; `q` serre la bande.
export type Swish = { from: number; to: number; at?: number; dur: number; gain: number; q?: number }
export type Synth = { tones: Tone[]; swish?: Swish }

// Famille de chaque son (case à cocher dans Réglages › Sons) ; null : notification.
export const GROUPS = {
  open: 'window',
  close: 'window',
  tap: 'clicks',
  toggleOn: 'clicks',
  toggleOff: 'clicks',
  panelOpen: 'clicks',
  panelClose: 'clicks',
  profile: 'clicks',
  editOn: 'grid',
  editOff: 'grid',
  add: 'grid',
  remove: 'grid',
  drop: 'grid',
  notify: null
} as const

export type SoundName = keyof typeof GROUPS
export type SynthPreset = Extract<SoundPreset, 'glass' | 'wood' | 'air'>
type Kit = Record<SoundName, Synth>

// Verre : notes douces qui tintent, un souffle à l'ouverture.
const glass: Kit = {
  open: {
    tones: [
      { f: 392, to: 523.25, dur: 0.22, gain: 0.5 },
      { f: 1046.5, at: 0.06, dur: 0.4, gain: 0.18 },
      { f: 1568, at: 0.09, dur: 0.3, gain: 0.07 }
    ],
    swish: { from: 600, to: 3200, dur: 0.24, gain: 0.12 }
  },
  close: {
    tones: [{ f: 523.25, to: 349.23, dur: 0.18, gain: 0.35 }],
    swish: { from: 2600, to: 500, dur: 0.18, gain: 0.08 }
  },
  tap: { tones: [{ f: 1760, dur: 0.035, gain: 0.16, wave: 'triangle' }] },
  toggleOn: {
    tones: [
      { f: 880, dur: 0.06, gain: 0.22 },
      { f: 1318.5, at: 0.05, dur: 0.1, gain: 0.2 }
    ]
  },
  toggleOff: {
    tones: [
      { f: 1318.5, dur: 0.06, gain: 0.16 },
      { f: 880, at: 0.05, dur: 0.09, gain: 0.14 }
    ]
  },
  panelOpen: {
    tones: [{ f: 659.25, to: 783.99, dur: 0.12, gain: 0.18 }],
    swish: { from: 900, to: 2400, dur: 0.16, gain: 0.07 }
  },
  panelClose: {
    tones: [{ f: 783.99, to: 659.25, dur: 0.1, gain: 0.14 }],
    swish: { from: 2400, to: 900, dur: 0.14, gain: 0.05 }
  },
  profile: {
    tones: [
      { f: 587.33, dur: 0.12, gain: 0.25 },
      { f: 880, at: 0.07, dur: 0.22, gain: 0.22 }
    ],
    swish: { from: 1200, to: 2800, dur: 0.2, gain: 0.06 }
  },
  editOn: {
    tones: [
      { f: 440, to: 659.25, dur: 0.12, gain: 0.3 },
      { f: 1318.5, at: 0.06, dur: 0.16, gain: 0.1 }
    ]
  },
  // « Terminé » : petite cadence mi → sol → do.
  editOff: {
    tones: [
      { f: 659.25, dur: 0.09, gain: 0.22 },
      { f: 783.99, at: 0.06, dur: 0.09, gain: 0.22 },
      { f: 1046.5, at: 0.12, dur: 0.26, gain: 0.22 }
    ]
  },
  // Bulle qui éclot.
  add: {
    tones: [
      { f: 330, to: 990, dur: 0.09, gain: 0.4 },
      { f: 1318.5, at: 0.07, dur: 0.22, gain: 0.14 }
    ]
  },
  remove: {
    tones: [{ f: 523.25, to: 174.61, dur: 0.15, gain: 0.4 }],
    swish: { from: 1800, to: 400, dur: 0.12, gain: 0.07 }
  },
  drop: {
    tones: [
      { f: 196, dur: 0.07, gain: 0.45, wave: 'triangle' },
      { f: 392, dur: 0.05, gain: 0.12 }
    ]
  },
  // Deux cloches de verre, do puis sol, qui résonnent.
  notify: {
    tones: [
      { f: 1046.5, dur: 0.5, gain: 0.22 },
      { f: 1567.98, at: 0.09, dur: 0.65, gain: 0.18 },
      { f: 3135.96, at: 0.09, dur: 0.25, gain: 0.04 }
    ],
    swish: { from: 1500, to: 4200, dur: 0.2, gain: 0.04 }
  }
}

// Lame de marimba : fondamentale, plus le partiel ×3,93 d'une lame de bois qui s'éteint vite.
const mallet = (f: number, at: number, dur: number, gain: number): Tone[] => [
  { f, at, dur, gain },
  { f: f * 3.93, at, dur: dur * 0.25, gain: gain * 0.3 }
]

// Bois : marimba feutré, registre grave, rien d'aigu.
const wood: Kit = {
  open: {
    tones: [...mallet(261.63, 0, 0.35, 0.35), ...mallet(392, 0.07, 0.4, 0.28)],
    swish: { from: 300, to: 1400, dur: 0.2, gain: 0.06 }
  },
  close: { tones: [...mallet(392, 0, 0.22, 0.25), ...mallet(261.63, 0.06, 0.28, 0.2)] },
  tap: { tones: mallet(1046.5, 0, 0.035, 0.12) },
  toggleOn: { tones: [...mallet(523.25, 0, 0.07, 0.18), ...mallet(783.99, 0.05, 0.1, 0.16)] },
  toggleOff: { tones: [...mallet(783.99, 0, 0.07, 0.14), ...mallet(523.25, 0.05, 0.09, 0.12)] },
  panelOpen: {
    tones: mallet(587.33, 0, 0.12, 0.16),
    swish: { from: 500, to: 1500, dur: 0.14, gain: 0.05 }
  },
  panelClose: {
    tones: mallet(493.88, 0, 0.1, 0.12),
    swish: { from: 1500, to: 500, dur: 0.12, gain: 0.04 }
  },
  profile: { tones: [...mallet(392, 0, 0.16, 0.22), ...mallet(587.33, 0.07, 0.24, 0.2)] },
  editOn: { tones: [...mallet(329.63, 0, 0.12, 0.25), ...mallet(493.88, 0.06, 0.16, 0.18)] },
  editOff: {
    tones: [
      ...mallet(523.25, 0, 0.1, 0.18),
      ...mallet(659.25, 0.06, 0.1, 0.18),
      ...mallet(783.99, 0.12, 0.3, 0.2)
    ]
  },
  add: {
    tones: [{ f: 261.63, to: 523.25, dur: 0.08, gain: 0.3 }, ...mallet(783.99, 0.06, 0.2, 0.12)]
  },
  remove: {
    tones: [{ f: 392, to: 146.83, dur: 0.14, gain: 0.3 }],
    swish: { from: 900, to: 300, dur: 0.1, gain: 0.05 }
  },
  drop: { tones: mallet(196, 0, 0.08, 0.4) },
  notify: { tones: [...mallet(523.25, 0, 0.6, 0.24), ...mallet(783.99, 0.11, 0.8, 0.22)] }
}

// Souffle : presque rien. Du bruit filtré qui monte ou descend ; une note à peine audible
// pour les moments rares, deux pour les notifications. Un bruit filtré perd beaucoup
// d'énergie : ses gains dépassent 1 pour sonner aussi fort que les autres ambiances.
const air: Kit = {
  open: {
    tones: [{ f: 1046.5, at: 0.08, dur: 0.35, gain: 0.125 }],
    swish: { from: 350, to: 3800, dur: 0.3, gain: 0.7 }
  },
  close: { tones: [], swish: { from: 3800, to: 350, dur: 0.22, gain: 0.75 } },
  tap: { tones: [], swish: { from: 3200, to: 2600, dur: 0.03, gain: 0.5, q: 2 } },
  toggleOn: { tones: [], swish: { from: 1800, to: 4200, dur: 0.06, gain: 0.45 } },
  toggleOff: { tones: [], swish: { from: 4200, to: 1800, dur: 0.06, gain: 0.35 } },
  panelOpen: { tones: [], swish: { from: 700, to: 3000, dur: 0.16, gain: 0.7 } },
  panelClose: { tones: [], swish: { from: 3000, to: 700, dur: 0.14, gain: 0.5 } },
  profile: {
    tones: [{ f: 1318.5, at: 0.06, dur: 0.25, gain: 0.125 }],
    swish: { from: 1200, to: 3400, dur: 0.18, gain: 0.4 }
  },
  editOn: { tones: [], swish: { from: 600, to: 2400, dur: 0.14, gain: 1.1 } },
  editOff: {
    tones: [{ f: 1568, at: 0.05, dur: 0.3, gain: 0.125 }],
    swish: { from: 2400, to: 900, dur: 0.16, gain: 0.4 }
  },
  add: { tones: [], swish: { from: 900, to: 5200, dur: 0.09, gain: 0.7 } },
  remove: { tones: [], swish: { from: 4200, to: 500, dur: 0.14, gain: 0.9 } },
  drop: { tones: [], swish: { from: 420, to: 260, dur: 0.06, gain: 2.2, q: 1.5 } },
  notify: {
    tones: [
      { f: 880, dur: 0.45, gain: 0.3 },
      { f: 1318.5, at: 0.1, dur: 0.6, gain: 0.25 }
    ],
    swish: { from: 1500, to: 4500, dur: 0.22, gain: 0.25 }
  }
}

export const SYNTHS: Record<SynthPreset, Kit> = { glass, wood, air }
