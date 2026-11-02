<script lang="ts">
  // Bouton œil : rappels allumés ou coupés ; temps avant le prochain ; pastilles d'intervalle.
  // Le réglage du widget est envoyé à Photon dès le montage : les rappels reprennent au démarrage.
  import EyeIcon from 'phosphor-svelte/lib/EyeIcon'
  import EyeClosedIcon from 'phosphor-svelte/lib/EyeClosedIcon'
  import type { EyesState } from '../../../shared/api'
  import { pollWhileVisible } from '../../lib/poll.svelte'
  import type { WidgetProps } from '../types'
  import type { EyesSettings } from './manifest'

  let { settings, save }: WidgetProps<EyesSettings> = $props()

  const INTERVALS = [20, 30, 45, 60]
  const minutes = $derived(INTERVALS.includes(settings.minutes) ? settings.minutes : 20)

  let current: EyesState = $state({ on: false, minutes: 20, next: null })
  let now = $state(Date.now())

  $effect(() => {
    void window.photon.eyesSet(settings.on, minutes).then((s) => {
      current = s
      now = Date.now()
    })
  })

  // Relu toutes les 15 s : le compte à rebours avance sans tourner pour rien.
  pollWhileVisible(async () => {
    current = await window.photon.eyes()
    now = Date.now()
  }, 15_000)

  const left = $derived(
    current.next === null ? 0 : Math.max(1, Math.ceil((current.next - now) / 60_000))
  )
</script>

<div class="widget">
  <button
    type="button"
    class="eye"
    class:on={settings.on}
    aria-pressed={settings.on}
    aria-label={settings.on ? 'Couper les rappels' : 'Allumer les rappels'}
    onclick={() => save({ ...settings, on: !settings.on })}
  >
    {#if settings.on}
      <EyeIcon size={22} weight="fill" aria-hidden="true" />
    {:else}
      <EyeClosedIcon size={22} aria-hidden="true" />
    {/if}
  </button>
  <div class="text">
    <span class="label">Pause des yeux</span>
    <span class="status" class:on={settings.on}>
      {settings.on && current.on ? `Prochaine pause dans ${left} min` : 'Rappels coupés'}
    </span>
  </div>
  <div class="intervals" data-no-drag>
    {#each INTERVALS as m (m)}
      <button
        type="button"
        class="chip"
        class:selected={minutes === m}
        aria-label="Toutes les {m} minutes"
        onclick={() => save({ ...settings, minutes: m, on: true })}>{m} min</button
      >
    {/each}
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

  .eye {
    display: grid;
    place-items: center;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: var(--white-8);
    color: var(--text-muted);
    transition: transform var(--dur-press) var(--ease-out);
  }

  .eye:active {
    transform: scale(var(--press-scale));
  }

  .eye.on {
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

  .intervals {
    grid-column: 1 / -1;
    display: flex;
    flex-wrap: wrap;
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

  button:focus-visible {
    outline: var(--focus-ring);
    outline-offset: var(--focus-offset);
  }

  @container (max-height: 110px) {
    .intervals {
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
