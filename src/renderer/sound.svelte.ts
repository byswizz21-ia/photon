// Sons de Photon : synthétisés à la volée (Web Audio), aucun fichier ni dépendance.
// Notes douces, courtes, accordées entre elles (gamme de do majeur) : du verre qui tinte.
// Le contexte audio naît au premier son puis se met en veille : un flux audio ouvert en
// permanence empêcherait la mise en veille de Windows.
import { untrack } from 'svelte'
import type { SoundSettings } from '../shared/model'
import { app } from './state.svelte'

// Note : fréquence (Hz), glissée vers `to`, départ décalé de `at` s, durée, volume relatif.
type Tone = {
  f: number
  to?: number
  at?: number
  dur: number
  gain?: number
  wave?: OscillatorType
}
// Souffle : bruit filtré dont la hauteur glisse de `from` à `to` (Hz).
type Swish = { from: number; to: number; at?: number; dur: number; gain: number }
type Group = keyof Pick<SoundSettings, 'window' | 'clicks' | 'grid'>
type Sound = { group: Group; tones: Tone[]; swish?: Swish }

const SOUNDS = {
  // Photon apparaît : sol → do qui monte, une octave cristalline, un souffle.
  open: {
    group: 'window',
    tones: [
      { f: 392, to: 523.25, dur: 0.22, gain: 0.5 },
      { f: 1046.5, at: 0.06, dur: 0.4, gain: 0.18 },
      { f: 1568, at: 0.09, dur: 0.3, gain: 0.07 }
    ],
    swish: { from: 600, to: 3200, dur: 0.24, gain: 0.12 }
  },
  close: {
    group: 'window',
    tones: [{ f: 523.25, to: 349.23, dur: 0.18, gain: 0.35 }],
    swish: { from: 2600, to: 500, dur: 0.18, gain: 0.08 }
  },
  tap: { group: 'clicks', tones: [{ f: 1760, dur: 0.035, gain: 0.16, wave: 'triangle' }] },
  toggleOn: {
    group: 'clicks',
    tones: [
      { f: 880, dur: 0.06, gain: 0.22 },
      { f: 1318.5, at: 0.05, dur: 0.1, gain: 0.2 }
    ]
  },
  toggleOff: {
    group: 'clicks',
    tones: [
      { f: 1318.5, dur: 0.06, gain: 0.16 },
      { f: 880, at: 0.05, dur: 0.09, gain: 0.14 }
    ]
  },
  panelOpen: {
    group: 'clicks',
    tones: [{ f: 659.25, to: 783.99, dur: 0.12, gain: 0.18 }],
    swish: { from: 900, to: 2400, dur: 0.16, gain: 0.07 }
  },
  panelClose: {
    group: 'clicks',
    tones: [{ f: 783.99, to: 659.25, dur: 0.1, gain: 0.14 }],
    swish: { from: 2400, to: 900, dur: 0.14, gain: 0.05 }
  },
  profile: {
    group: 'clicks',
    tones: [
      { f: 587.33, dur: 0.12, gain: 0.25 },
      { f: 880, at: 0.07, dur: 0.22, gain: 0.22 }
    ],
    swish: { from: 1200, to: 2800, dur: 0.2, gain: 0.06 }
  },
  editOn: {
    group: 'grid',
    tones: [
      { f: 440, to: 659.25, dur: 0.12, gain: 0.3 },
      { f: 1318.5, at: 0.06, dur: 0.16, gain: 0.1 }
    ]
  },
  // « Terminé » : petite cadence mi → sol → do.
  editOff: {
    group: 'grid',
    tones: [
      { f: 659.25, dur: 0.09, gain: 0.22 },
      { f: 783.99, at: 0.06, dur: 0.09, gain: 0.22 },
      { f: 1046.5, at: 0.12, dur: 0.26, gain: 0.22 }
    ]
  },
  // Bulle qui éclot.
  add: {
    group: 'grid',
    tones: [
      { f: 330, to: 990, dur: 0.09, gain: 0.4 },
      { f: 1318.5, at: 0.07, dur: 0.22, gain: 0.14 }
    ]
  },
  remove: {
    group: 'grid',
    tones: [{ f: 523.25, to: 174.61, dur: 0.15, gain: 0.4 }],
    swish: { from: 1800, to: 400, dur: 0.12, gain: 0.07 }
  },
  // Carte posée ou redimensionnée : un « toc » mat.
  drop: {
    group: 'grid',
    tones: [
      { f: 196, dur: 0.07, gain: 0.45, wave: 'triangle' },
      { f: 392, dur: 0.05, gain: 0.12 }
    ]
  }
} satisfies Record<string, Sound>

export type SoundName = keyof typeof SOUNDS

const MASTER = 0.8 // à 100 % : ouverture vers -8 dB, clic vers -18 dB
const ATTACK = 0.006 // s : pas de clic à l'attaque
const SLEEP = 2000 // ms de silence avant la mise en veille du contexte audio

let audio: AudioContext | undefined
let noise: AudioBuffer | undefined
let sleepTimer: ReturnType<typeof setTimeout> | undefined
let lastPlayed = 0 // performance.now() du dernier son joué

// force : joue même si la famille est coupée (aperçu du volume dans les réglages).
export function play(name: SoundName, force = false): void {
  const sound: Sound = SOUNDS[name]
  const settings = app.settings.sound
  if (!settings.enabled || settings.volume <= 0 || (!force && !settings[sound.group])) return
  lastPlayed = performance.now()
  audio ??= new AudioContext({ latencyHint: 'interactive' })
  clearTimeout(sleepTimer)
  const context = audio
  const start = (): void => {
    schedule(context, sound, settings.volume)
    clearTimeout(sleepTimer)
    sleepTimer = setTimeout(() => void context.suspend(), SLEEP)
  }
  if (context.state === 'running') start()
  else void context.resume().then(start, () => {})
}

function schedule(context: AudioContext, sound: Sound, volume: number): void {
  const out = context.createGain()
  out.gain.value = volume * volume * MASTER // carré : curseur perçu comme régulier
  out.connect(context.destination)
  const t0 = context.currentTime + 0.005
  let end = t0
  for (const t of sound.tones) end = Math.max(end, tone(context, out, t, t0))
  if (sound.swish) end = Math.max(end, swish(context, out, sound.swish, t0))
  setTimeout(() => out.disconnect(), (end - t0) * 1000 + 200)
}

// Enveloppe : montée éclair puis décroissance exponentielle (son de cloche, pas de bip).
function envelope(
  context: AudioContext,
  gain: number,
  at: number,
  peak: number,
  end: number
): GainNode {
  const env = context.createGain()
  env.gain.setValueAtTime(0.0001, at)
  env.gain.exponentialRampToValueAtTime(gain, peak)
  env.gain.exponentialRampToValueAtTime(0.0001, end)
  return env
}

function tone(context: AudioContext, out: AudioNode, t: Tone, t0: number): number {
  const at = t0 + (t.at ?? 0)
  const end = at + t.dur
  const osc = context.createOscillator()
  osc.type = t.wave ?? 'sine'
  osc.frequency.setValueAtTime(t.f, at)
  if (t.to) osc.frequency.exponentialRampToValueAtTime(t.to, end)
  osc.connect(envelope(context, t.gain ?? 1, at, at + ATTACK, end)).connect(out)
  osc.start(at)
  osc.stop(end + 0.02)
  return end
}

function swish(context: AudioContext, out: AudioNode, s: Swish, t0: number): number {
  const at = t0 + (s.at ?? 0)
  const end = at + s.dur
  if (!noise) {
    noise = context.createBuffer(1, context.sampleRate / 2, context.sampleRate)
    const samples = noise.getChannelData(0)
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1
  }
  const source = context.createBufferSource()
  source.buffer = noise
  const band = context.createBiquadFilter()
  band.type = 'bandpass'
  band.Q.value = 1.2
  band.frequency.setValueAtTime(s.from, at)
  band.frequency.exponentialRampToValueAtTime(s.to, end)
  source
    .connect(band)
    .connect(envelope(context, s.gain, at, at + s.dur * 0.4, end))
    .connect(out)
  source.start(at)
  source.stop(end + 0.02)
  return end
}

const CLICKABLE =
  'button, a[href], input[type="checkbox"], input[type="radio"], [role="button"], [role="menuitem"], [role="tab"]'

// Clic sur un bouton ou une case (écouteur sur toute la fenêtre) : petit « tic », ou bascule
// pour une case à cocher. Joué juste après : si l'action a déjà son propre son, on se tait.
export function clickSound(event: MouseEvent): void {
  const target = event.target instanceof Element ? event.target.closest(CLICKABLE) : null
  if (!target || target.matches(':disabled')) return
  const name: SoundName =
    target instanceof HTMLInputElement && target.type === 'checkbox'
      ? target.checked
        ? 'toggleOn'
        : 'toggleOff'
      : 'tap'
  const clickedAt = performance.now()
  setTimeout(() => {
    if (lastPlayed < clickedAt) play(name)
  }, 0)
}

// Son quand la valeur lue change (pas au montage), seulement Photon affiché : le mode édition
// et les réglages se referment en silence quand Photon se cache.
export function soundOnChange<T>(read: () => T, sound: (value: T) => SoundName): void {
  let first = true
  $effect(() => {
    const value = read()
    if (first) {
      first = false
      return
    }
    untrack(() => {
      if (app.visible) play(sound(value))
    })
  })
}
