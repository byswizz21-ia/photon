<script lang="ts">
  // Gros bouton tasse : allume ou coupe l'anti-veille avec la durée choisie. Les pastilles de
  // durée relancent tout de suite avec la nouvelle durée. Case « Écran allumé ».
  import CoffeeIcon from 'phosphor-svelte/lib/CoffeeIcon'
  import type { AwakeState } from '../../../shared/api'
  import { pollWhileVisible } from '../../lib/poll.svelte'
  import type { WidgetProps } from '../types'
  import type { AwakeSettings } from './manifest'

  let { settings, save }: WidgetProps<AwakeSettings> = $props()

  const DURATIONS = [
    { minutes: 30, label: '30 min' },
    { minutes: 60, label: '1 h' },
    { minutes: 120, label: '2 h' },
    { minutes: 240, label: '4 h' },
    { minutes: 0, label: '∞' }
  ]

  let current: AwakeState = $state({ on: false, screen: false, until: null })
  // Relu toutes les 5 s : la fin d'une durée se voit sans rouvrir Photon.
  pollWhileVisible(async () => (current = await window.photon.awake()), 5_000)

  const time = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const status = $derived(
    !current.on
      ? 'Veille normale'
      : current.until === null
        ? "Éveillé jusqu'à l'arrêt"
        : `Éveillé jusqu'à ${time.format(current.until)}`
  )

  async function start(minutes: number, screen: boolean): Promise<void> {
    current = await window.photon.awakeStart(minutes > 0 ? minutes : null, screen)
  }

  async function toggle(): Promise<void> {
    if (current.on) current = await window.photon.awakeStop()
    else await start(settings.minutes, settings.screen)
  }

  function pick(minutes: number): void {
    save({ ...settings, minutes })
    void start(minutes, settings.screen)
  }

  function screen(on: boolean): void {
    save({ ...settings, screen: on })
    if (current.on) void start(settings.minutes, on)
  }
</script>

<div class="widget">
  <button
    type="button"
    class="cup"
    class:on={current.on}
    aria-pressed={current.on}
    aria-label={current.on ? "Couper l'anti-veille" : "Allumer l'anti-veille"}
    onclick={toggle}
  >
    <CoffeeIcon size={22} weight={current.on ? 'fill' : 'regular'} aria-hidden="true" />
  </button>
  <div class="text">
    <span class="label">Anti-veille</span>
    <span class="status" class:on={current.on}>{status}</span>
  </div>
  <div class="durations" data-no-drag>
    {#each DURATIONS as d (d.minutes)}
      <button
        type="button"
        class="chip"
        class:selected={settings.minutes === d.minutes}
        aria-label={d.minutes ? `Éveillé ${d.label}` : "Éveillé jusqu'à l'arrêt"}
        onclick={() => pick(d.minutes)}>{d.label}</button
      >
    {/each}
    <label class="screen">
      <input
        type="checkbox"
        checked={settings.screen}
        onchange={(event) => screen(event.currentTarget.checked)}
      />
      Écran allumé
    </label>
  </div>
</div>

<style>
  .widget {
    box-sizing: border-box;
    height: 100%;
    padding: clamp(8px, 8cqmin, 20px);
    display: grid;
    grid-template-columns: auto 1fr;
    align-content: center;
    align-items: center;
    gap: 10px 12px;
    overflow: hidden;
  }

  button {
    padding: 0;
    border: 0;
    font: inherit;
    cursor: pointer;
  }

  .cup {
    display: grid;
    place-items: center;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: var(--white-8);
    color: var(--text-muted);
    transition: transform var(--dur-press) var(--ease-out);
  }

  .cup:active {
    transform: scale(var(--press-scale));
  }

  .cup.on {
    background: var(--accent);
    color: var(--on-accent);
    box-shadow: var(--glow-card);
  }

  .text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .label {
    font-size: var(--text-12);
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
    color: var(--text-faint);
  }

  .status {
    font-size: var(--text-14);
    color: var(--text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .status.on {
    color: var(--text);
  }

  .durations {
    grid-column: 1 / -1;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }

  .chip {
    height: var(--control-h-chip);
    padding: 0 10px;
    border-radius: var(--radius-pill);
    background: var(--white-5);
    color: var(--text-muted);
    font-size: var(--text-12);
  }

  .chip:hover {
    background: var(--surface-hover);
  }

  .chip.selected {
    background: var(--surface-accent-soft);
    color: var(--accent);
  }

  .screen {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-left: 4px;
    font-size: var(--text-12);
    color: var(--text-muted);
    cursor: pointer;
  }

  .screen input {
    margin: 0;
    accent-color: var(--accent);
  }

  button:focus-visible {
    outline: var(--focus-ring);
    outline-offset: var(--focus-offset);
  }

  /* Petite case : la tasse seule (1 × 1), ou la tasse et l'état (1 rang). */
  @container (max-height: 110px) {
    .durations {
      display: none;
    }
  }

  @container (max-width: 160px) {
    .widget {
      grid-template-columns: 1fr;
      justify-items: center;
    }
    .text {
      display: none;
    }
  }
</style>
