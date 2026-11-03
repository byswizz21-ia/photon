// Sons de Photon, dans l'ambiance choisie (Réglages › Sons) : synthétisés à la volée
// (sounds/synth.ts) ou joués depuis de courts fichiers (sounds/samples.ts).
// Le contexte audio naît au premier son puis se met en veille : un flux audio ouvert en
// permanence empêcherait la mise en veille de Windows.
import { untrack } from 'svelte'
import type { SoundPreset } from '../shared/model'
import { loadKit, type SamplePreset } from './sounds/samples'
import { GROUPS, SYNTHS, type SoundName, type Swish, type Synth, type Tone } from './sounds/synth'
import { app } from './state.svelte'

export type { SoundName }

const MASTER = 0.8 // à 100 % : ouverture vers -8 dB, clic vers -18 dB (fichiers calés pareil)
const ATTACK = 0.006 // s : pas de clic à l'attaque
const SLEEP = 2000 // ms de silence avant la mise en veille du contexte audio

let audio: AudioContext | undefined
let noise: AudioBuffer | undefined
let sleepTimer: ReturnType<typeof setTimeout> | undefined
let lastPlayed = 0 // performance.now() du dernier son joué

// force : joue même si la famille est coupée (aperçu dans les réglages).
export function play(name: SoundName, force = false): void {
  const settings = app.settings.sound
  const group = GROUPS[name]
  if (!settings.enabled || (!force && group && !settings[group])) return
  ring(name, settings.volume, settings.preset)
}

const isSynth = (preset: SoundPreset): preset is keyof typeof SYNTHS => preset in SYNTHS

// Prépare les fichiers d'une ambiance (le premier son ne les attend pas).
export function preloadSounds(preset: SoundPreset): void {
  if (!isSynth(preset)) void loadKit(preset)
}

// Joue un son à ce volume (0 à 1) ; la fenêtre des notifications reçoit le sien de Photon.
export function ring(name: SoundName, volume: number, preset: SoundPreset): void {
  if (volume <= 0) return
  lastPlayed = performance.now()
  audio ??= new AudioContext({ latencyHint: 'interactive' })
  clearTimeout(sleepTimer)
  const context = audio
  const start = (): void => {
    if (isSynth(preset)) schedule(context, SYNTHS[preset][name], volume)
    else void loadKit(preset as SamplePreset).then((kit) => sample(context, kit[name], volume))
    clearTimeout(sleepTimer)
    sleepTimer = setTimeout(() => void context.suspend(), SLEEP)
  }
  if (context.state === 'running') start()
  else void context.resume().then(start, () => {})
}

// Sortie d'un son : volume au carré (curseur perçu comme régulier), débranchée à la fin.
function output(context: AudioContext, volume: number, seconds: number): GainNode {
  const out = context.createGain()
  out.gain.value = volume * volume * MASTER
  out.connect(context.destination)
  setTimeout(() => out.disconnect(), seconds * 1000 + 200)
  return out
}

function sample(context: AudioContext, buffer: AudioBuffer | undefined, volume: number): void {
  if (!buffer) return
  const source = context.createBufferSource()
  source.buffer = buffer
  source.connect(output(context, volume, buffer.duration))
  source.start()
}

function schedule(context: AudioContext, sound: Synth, volume: number): void {
  const t0 = context.currentTime + 0.005
  const length = Math.max(
    0,
    ...sound.tones.map((t) => (t.at ?? 0) + t.dur),
    sound.swish ? (sound.swish.at ?? 0) + sound.swish.dur : 0
  )
  const out = output(context, volume, length)
  for (const t of sound.tones) tone(context, out, t, t0)
  if (sound.swish) swish(context, out, sound.swish, t0)
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

function tone(context: AudioContext, out: AudioNode, t: Tone, t0: number): void {
  const at = t0 + (t.at ?? 0)
  const end = at + t.dur
  const osc = context.createOscillator()
  osc.type = t.wave ?? 'sine'
  osc.frequency.setValueAtTime(t.f, at)
  if (t.to) osc.frequency.exponentialRampToValueAtTime(t.to, end)
  osc.connect(envelope(context, t.gain ?? 1, at, at + ATTACK, end)).connect(out)
  osc.start(at)
  osc.stop(end + 0.02)
}

function swish(context: AudioContext, out: AudioNode, s: Swish, t0: number): void {
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
  band.Q.value = s.q ?? 1.2
  band.frequency.setValueAtTime(s.from, at)
  band.frequency.exponentialRampToValueAtTime(s.to, end)
  source
    .connect(band)
    .connect(envelope(context, s.gain, at, at + s.dur * 0.4, end))
    .connect(out)
  source.start(at)
  source.stop(end + 0.02)
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
