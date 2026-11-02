<script lang="ts">
  // Rien de programmé : choix de l'action, de la durée, bouton « Programmer ».
  // Programmé : l'heure, le temps restant, bouton « Annuler ».
  import type { ShutdownAction, ShutdownState } from '../../../shared/api'
  import { pollWhileVisible } from '../../lib/poll.svelte'
  import type { WidgetProps } from '../types'
  import type { ShutdownSettings } from './manifest'

  let { settings, save }: WidgetProps<ShutdownSettings> = $props()

  const ACTIONS: { id: ShutdownAction; label: string; done: string }[] = [
    { id: 'shutdown', label: 'Éteindre', done: 'Arrêt' },
    { id: 'restart', label: 'Redémarrer', done: 'Redémarrage' },
    { id: 'sleep', label: 'Veille', done: 'Veille' }
  ]
  const DURATIONS = [15, 30, 60, 120]

  let current: ShutdownState = $state({ action: null, at: null })
  let now = $state(Date.now())
  pollWhileVisible(async () => {
    current = await window.photon.shutdownState()
    now = Date.now()
  }, 5_000)

  const action = $derived(ACTIONS.find((a) => a.id === settings.action) ?? ACTIONS[0]!)
  const minutes = $derived(
    Number.isInteger(settings.minutes) && settings.minutes >= 1 && settings.minutes <= 1440
      ? settings.minutes
      : 60
  )
  const time = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const left = $derived(current.at === null ? 0 : Math.max(0, current.at - now))
  // « 45 min », « 2 h », « 1 h 30 ».
  const label = (m: number): string =>
    m < 60
      ? `${m} min`
      : `${Math.floor(m / 60)} h${m % 60 ? ` ${String(m % 60).padStart(2, '0')}` : ''}`
  const leftLabel = $derived(label(Math.ceil(left / 60_000)))

  async function start(): Promise<void> {
    current = await window.photon.shutdownStart(action.id, minutes)
    now = Date.now()
  }

  async function cancel(): Promise<void> {
    current = await window.photon.shutdownCancel()
  }
</script>

<div class="widget">
  <span class="label">Minuteur d'arrêt</span>
  {#if current.action && current.at}
    {@const planned = ACTIONS.find((a) => a.id === current.action)}
    <p class="when">{planned?.done} à {time.format(current.at)}</p>
    <p class="left">dans {leftLabel}</p>
    <button type="button" class="main cancel" onclick={cancel}>Annuler</button>
  {:else}
    <div class="ways" role="radiogroup" aria-label="Action" data-no-drag>
      {#each ACTIONS as a (a.id)}
        <button
          type="button"
          role="radio"
          aria-checked={a.id === action.id}
          class:selected={a.id === action.id}
          onclick={() => save({ ...settings, action: a.id })}>{a.label}</button
        >
      {/each}
    </div>
    <div class="chips" data-no-drag>
      {#each DURATIONS as m (m)}
        <button
          type="button"
          class="chip"
          class:selected={m === minutes}
          onclick={() => save({ ...settings, minutes: m })}>{label(m)}</button
        >
      {/each}
      <input
        type="number"
        min="1"
        max="1440"
        value={minutes}
        aria-label="Minutes"
        onchange={(event) =>
          save({ ...settings, minutes: Math.round(Number(event.currentTarget.value)) })}
      />
    </div>
    <button type="button" class="main" onclick={start}>{action.label} dans {label(minutes)}</button>
  {/if}
</div>

<style>
  .widget {
    box-sizing: border-box;
    height: 100%;
    padding: clamp(12px, 8cqmin, 20px);
    display: flex;
    flex-direction: column;
    gap: 10px;
    overflow: hidden;
  }

  .label {
    font-size: var(--text-12);
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
    color: var(--text-faint);
  }

  p {
    margin: 0;
  }

  .when {
    font-size: var(--text-display-s);
    font-weight: var(--weight-light);
    letter-spacing: var(--tracking-title);
    line-height: 1.1;
  }

  .left {
    font-size: var(--text-14);
    color: var(--accent);
  }

  button {
    padding: 0;
    border: 0;
    font: inherit;
    cursor: pointer;
  }

  .ways {
    display: flex;
    align-self: flex-start;
    padding: 2px;
    border-radius: var(--radius-pill);
    background: var(--white-5);
  }

  .ways button {
    height: 26px;
    padding: 0 12px;
    border-radius: var(--radius-pill);
    background: none;
    color: var(--text-muted);
    font-size: var(--text-12);
  }

  .ways button.selected {
    background: var(--white-12);
    color: var(--text);
  }

  .chips {
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

  input {
    box-sizing: border-box;
    width: 64px;
    height: var(--control-h-chip);
    padding: 0 8px;
    border: 1px solid var(--line);
    border-radius: var(--radius-pill);
    background: var(--white-5);
    color: var(--text);
    font: inherit;
    font-size: var(--text-12);
    outline: 0;
  }

  input:focus {
    border-color: var(--border-focus);
  }

  .main {
    margin-top: auto;
    min-height: var(--control-h);
    border-radius: var(--radius-pill);
    background: var(--accent);
    color: var(--on-accent);
    font-size: var(--text-13);
    font-weight: var(--weight-medium);
    transition: transform var(--dur-press) var(--ease-out);
  }

  .main:active {
    transform: scale(var(--press-scale));
  }

  .main.cancel {
    background: var(--danger-surface);
    color: var(--danger-text-strong);
  }

  button:focus-visible {
    outline: var(--focus-ring);
    outline-offset: var(--focus-offset);
  }
</style>
