<script lang="ts">
  // Anneau qui se vide, temps restant, lecture / pause, passer, arrêter. Durées en mode édition.
  import ArrowCounterClockwiseIcon from 'phosphor-svelte/lib/ArrowCounterClockwiseIcon'
  import PauseIcon from 'phosphor-svelte/lib/PauseIcon'
  import PlayIcon from 'phosphor-svelte/lib/PlayIcon'
  import SkipForwardIcon from 'phosphor-svelte/lib/SkipForwardIcon'
  import type { PomodoroCommand, PomodoroState } from '../../../shared/api'
  import { pollWhileVisible } from '../../lib/poll.svelte'
  import type { WidgetProps } from '../types'
  import type { PomodoroSettings } from './manifest'

  let { settings, editing, save }: WidgetProps<PomodoroSettings> = $props()

  let timer = $state.raw<PomodoroState>()
  let now = $state(Date.now())

  pollWhileVisible(async () => {
    timer = await window.photon.pomodoro()
    now = Date.now()
  }, 1_000)

  async function control(command: PomodoroCommand): Promise<void> {
    timer = await window.photon.pomodoroControl(command, settings.focus, settings.pause)
    now = Date.now()
  }

  const left = $derived(
    !timer || timer.phase === 'idle'
      ? settings.focus * 60_000
      : timer.running
        ? Math.max(0, timer.endsAt - now)
        : timer.left
  )
  const progress = $derived(timer && timer.total > 0 ? left / timer.total : 1)
  const label = $derived(
    timer?.phase === 'focus' ? 'Travail' : timer?.phase === 'pause' ? 'Pause' : 'Pomodoro'
  )

  const clock = (ms: number): string => {
    const s = Math.ceil(ms / 1000)
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  }

  const R = 44
  const CIRCLE = 2 * Math.PI * R

  const setMinutes = (key: 'focus' | 'pause', value: number): void => {
    if (Number.isFinite(value))
      save({ ...settings, [key]: Math.min(Math.max(Math.round(value), 1), 180) })
  }
</script>

<div class="widget" class:pause={timer?.phase === 'pause'}>
  <div class="ring" role="timer" aria-label="{label} : {clock(left)}">
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <circle class="track" cx="50" cy="50" r={R} />
      <circle
        class="fill"
        cx="50"
        cy="50"
        r={R}
        stroke-dasharray={CIRCLE}
        stroke-dashoffset={CIRCLE * (1 - progress)}
      />
    </svg>
    <span class="time">{clock(left)}</span>
  </div>
  <div class="side">
    <span class="label">{label}</span>
    {#if editing}
      <label class="field">
        Travail (min)
        <input
          type="number"
          min="1"
          max="180"
          value={settings.focus}
          onchange={(event) => setMinutes('focus', event.currentTarget.valueAsNumber)}
        />
      </label>
      <label class="field">
        Pause (min)
        <input
          type="number"
          min="1"
          max="180"
          value={settings.pause}
          onchange={(event) => setMinutes('pause', event.currentTarget.valueAsNumber)}
        />
      </label>
    {:else}
      <div class="controls">
        <button
          type="button"
          class="play"
          aria-label={timer?.running ? 'Pause' : 'Démarrer'}
          onclick={() => control(timer?.running ? 'pause' : 'start')}
        >
          {#if timer?.running}<PauseIcon size={18} weight="fill" />{:else}<PlayIcon
              size={18}
              weight="fill"
            />{/if}
        </button>
        {#if timer && timer.phase !== 'idle'}
          <button
            type="button"
            class="icon"
            aria-label="Phase suivante"
            onclick={() => control('skip')}
          >
            <SkipForwardIcon size={16} weight="fill" />
          </button>
          <button type="button" class="icon" aria-label="Arrêter" onclick={() => control('reset')}>
            <ArrowCounterClockwiseIcon size={16} />
          </button>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .widget {
    box-sizing: border-box;
    height: 100%;
    padding: clamp(12px, 8cqmin, 20px);
    display: flex;
    align-items: center;
    gap: clamp(12px, 6cqmin, 20px);
  }

  .ring {
    position: relative;
    flex: none;
    height: 100%;
    max-height: 160px;
    aspect-ratio: 1;
    display: grid;
    place-items: center;
  }

  svg {
    position: absolute;
    inset: 0;
    transform: rotate(-90deg);
  }

  circle {
    fill: none;
    stroke-width: 6;
    stroke-linecap: round;
  }

  .track {
    stroke: rgb(255 255 255 / 0.1);
  }

  .fill {
    stroke: var(--accent);
    filter: drop-shadow(0 0 6px color-mix(in srgb, var(--accent) 60%, transparent));
  }

  /* Pause : l'anneau passe à la couleur secondaire. */
  .pause .fill {
    stroke: var(--glow-secondary);
  }

  .time {
    font-size: clamp(16px, 11cqmin, 30px);
    font-weight: 300;
    font-variant-numeric: tabular-nums;
  }

  .side {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .label {
    font-size: 12px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-faint);
  }

  .controls {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  button {
    display: grid;
    place-items: center;
    padding: 0;
    border: 0;
    cursor: pointer;
    transition: transform 300ms var(--ease-spring);
  }

  button:active {
    transform: scale(0.9);
    transition-duration: 100ms;
  }

  .play {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: var(--text);
    color: var(--bg);
  }

  .icon {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: none;
    color: var(--text-muted);
  }

  .icon:hover {
    color: var(--text);
    background: rgb(255 255 255 / 0.08);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
    color: var(--text-muted);
  }

  .field input {
    width: 72px;
    min-height: 28px;
    padding: 0 8px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: rgb(255 255 255 / 0.05);
    color: var(--text);
    font: inherit;
  }

  button:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  /* Petite case : l'anneau seul, clic dessus impossible → on garde les boutons dessous. */
  @container (max-width: 240px) {
    .widget {
      flex-direction: column;
      justify-content: center;
    }

    .ring {
      height: auto;
      width: 60%;
    }

    .label {
      display: none;
    }
  }
</style>
