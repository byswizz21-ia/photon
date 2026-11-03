<script lang="ts">
  // Design « Molette » (3×3) : arc de 270° à tourner à la souris (ou molette sur la carte),
  // volume au centre, sorties en icônes rondes (l'actuelle en accent).
  import SpeakerHighIcon from 'phosphor-svelte/lib/SpeakerHighIcon'
  import SpeakerLowIcon from 'phosphor-svelte/lib/SpeakerLowIcon'
  import SpeakerSlashIcon from 'phosphor-svelte/lib/SpeakerSlashIcon'
  import type { AudioState } from '../../../shared/api'
  import RollingNumber from '../../lib/RollingNumber.svelte'
  import { deviceKind, split } from './devices'
  import { DEVICE_ICONS, type Sound } from './sound.svelte'

  let { sound, audio }: { sound: Sound; audio: AudioState } = $props()

  const point = (deg: number): string => {
    const rad = (deg * Math.PI) / 180
    return `${(84 + 70 * Math.cos(rad)).toFixed(2)},${(84 + 70 * Math.sin(rad)).toFixed(2)}`
  }
  const sweep = $derived((270 * sound.volume) / 100)
  const end = $derived(point(135 + sweep))
  const current = $derived(audio.devices.find((d) => d.id === audio.current))

  // Angle du pointeur autour du centre → volume (0 en bas à gauche, 100 en bas à droite).
  function at(event: PointerEvent): void {
    const r = (event.currentTarget as HTMLElement).getBoundingClientRect()
    const deg =
      (Math.atan2(event.clientY - r.top - r.height / 2, event.clientX - r.left - r.width / 2) *
        180) /
      Math.PI
    let a = (deg - 135 + 720) % 360
    if (a > 270) a = a > 315 ? 0 : 270 // trou du bas : bord le plus proche
    sound.drag = Math.round((a / 270) * 100)
    void sound.set(sound.drag)
  }

  async function release(): Promise<void> {
    if (sound.drag === null) return
    await sound.read()
    sound.drag = null
  }
</script>

<div class="widget" data-no-press onwheel={sound.wheel}>
  <div class="head">
    <span class="label">Son</span>
    <button
      type="button"
      class="mute"
      class:on={audio.muted}
      aria-label={audio.muted ? 'Rétablir le son' : 'Couper le son'}
      aria-pressed={audio.muted}
      onclick={sound.mute}
    >
      {#if audio.muted}<SpeakerSlashIcon size={16} />{:else if sound.volume < 50}<SpeakerLowIcon
          size={16}
        />{:else}<SpeakerHighIcon size={16} />{/if}
    </button>
  </div>
  <div class="stage">
    <div
      class="knob"
      class:muted={audio.muted}
      role="slider"
      tabindex="0"
      aria-label="Volume"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={sound.volume}
      data-no-drag
      onpointerdown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId)
        at(event)
      }}
      onpointermove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) at(event)
      }}
      onpointerup={release}
      onpointercancel={release}
      onkeydown={(event) => {
        const step = { ArrowUp: 2, ArrowRight: 2, ArrowDown: -2, ArrowLeft: -2 }[event.key]
        if (step) void sound.set(sound.volume + step)
      }}
    >
      <svg viewBox="0 0 168 168" aria-hidden="true">
        <path class="track" d="M{point(135)} A70,70 0 1 1 {point(45)}" />
        {#if sound.volume > 0}
          <path class="value" d="M{point(135)} A70,70 0 {sweep > 180 ? 1 : 0} 1 {end}" />
        {/if}
        <circle class="thumb" cx={end.split(',')[0]} cy={end.split(',')[1]} r="8" />
      </svg>
      <div class="center">
        <span class="num"><RollingNumber value={String(sound.volume)} /></span>
        <span class="device">{audio.muted ? 'Son coupé' : split(current?.name ?? '')[0]}</span>
      </div>
    </div>
  </div>
  <div class="outputs">
    {#each audio.devices as device (device.id)}
      {@const Icon = DEVICE_ICONS[deviceKind(device.name)]}
      {@const on = device.id === audio.current}
      <button
        type="button"
        class="output"
        class:on
        aria-pressed={on}
        title={device.name}
        aria-label={device.name}
        onclick={() => sound.device(device.id)}
      >
        <Icon size={18} weight={on ? 'duotone' : 'regular'} />
      </button>
    {/each}
  </div>
</div>

<style>
  .widget {
    box-sizing: border-box;
    height: 100%;
    padding: 16px 18px 18px;
    display: flex;
    flex-direction: column;
  }

  .head {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .label {
    font-size: var(--text-12);
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
    color: var(--text-faint);
  }

  button {
    padding: 0;
    display: grid;
    place-items: center;
    border-radius: 50%;
    border: 1px solid var(--line);
    background: var(--white-5);
    color: var(--text-muted);
    cursor: pointer;
    transition: transform var(--dur-spring) var(--ease-spring);
  }

  button:active {
    transform: scale(0.9);
    transition-duration: var(--dur-press);
  }

  button:focus-visible,
  .knob:focus-visible {
    outline: var(--focus-ring);
    outline-offset: var(--focus-offset);
  }

  .mute {
    width: 32px;
    height: 32px;
  }

  .mute.on {
    border-color: var(--danger-border);
    background: var(--danger-surface);
    color: var(--danger-text);
  }

  .stage {
    flex: 1;
    min-height: 0;
    display: grid;
    place-items: center;
  }

  /* 168 px à la taille de la maquette, plus grand si la carte grandit. */
  .knob {
    position: relative;
    width: max(168px, min(100cqh - 110px, 100cqw - 36px));
    aspect-ratio: 1;
    border-radius: 50%;
    cursor: grab;
    touch-action: none;
  }

  svg {
    position: absolute;
    inset: 0;
    overflow: visible;
  }

  path {
    fill: none;
    stroke-width: 10;
    stroke-linecap: round;
  }

  .track {
    stroke: var(--white-8);
  }

  .value {
    stroke: var(--accent);
    filter: drop-shadow(0 0 6px color-mix(in srgb, var(--accent) 70%, transparent));
  }

  .muted .value {
    opacity: 0.3;
    filter: none;
  }

  .thumb {
    fill: var(--text);
    filter: drop-shadow(var(--shadow-thumb));
  }

  .center {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    pointer-events: none;
  }

  .num {
    font-size: 46px;
    font-weight: var(--weight-light);
    letter-spacing: var(--tracking-display);
    line-height: 1;
    transition: opacity var(--dur-hover) var(--ease-out);
  }

  .muted .num {
    opacity: 0.35;
  }

  .device {
    max-width: 80%;
    font-size: var(--text-12);
    color: var(--text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .outputs {
    display: flex;
    justify-content: center;
    gap: 8px;
  }

  .output {
    width: 38px;
    height: 38px;
  }

  .output.on {
    border-color: var(--border-accent-soft);
    background: var(--surface-accent-soft);
    color: var(--text);
  }
</style>
