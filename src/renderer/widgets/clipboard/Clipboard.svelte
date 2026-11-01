<script lang="ts">
  // Épinglés d'abord, puis l'historique (relu chaque seconde fenêtre visible). Clic : recopie le
  // texte (il remonte en tête) ; punaise : épingle ou désépingle.
  import PushPinIcon from 'phosphor-svelte/lib/PushPinIcon'
  import { pollWhileVisible } from '../../lib/poll.svelte'
  import { shared } from '../../lib/shared.svelte'
  import type { WidgetProps } from '../types'
  import type { ClipboardSettings } from './manifest'

  // Aucun réglage : props déclarées pour le type seulement (voir System.svelte).
  // eslint-disable-next-line no-empty-pattern
  let {}: WidgetProps<ClipboardSettings> = $props()

  const MAX_PINS = 20
  const MAX_TEXT = 20_000

  const pinned = shared('clipboard-pins', (raw) => {
    const list = (raw as { pins?: unknown } | null)?.pins
    const pins = Array.isArray(list)
      ? list.filter((t): t is string => typeof t === 'string' && t.length <= MAX_TEXT)
      : []
    return { pins: pins.slice(0, MAX_PINS) }
  })

  let history = $state.raw<string[]>([])
  let copied = $state<string | null>(null)
  let timer: ReturnType<typeof setTimeout> | undefined

  pollWhileVisible(async () => {
    history = await window.photon.clipboardHistory()
  }, 1_000)

  const recent = $derived(history.filter((text) => !pinned.value.pins.includes(text)))

  function copy(text: string): void {
    window.photon.copyText(text)
    copied = text
    clearTimeout(timer)
    timer = setTimeout(() => (copied = null), 1_200)
  }

  function pin(text: string): void {
    const pins = pinned.value.pins
    pinned.value.pins = pins.includes(text)
      ? pins.filter((t) => t !== text)
      : [text, ...pins].slice(0, MAX_PINS)
    pinned.save()
  }

  $effect(() => () => clearTimeout(timer))

  // Une ligne d'aperçu : espaces et retours à la ligne réduits.
  const preview = (text: string): string => text.replace(/\s+/g, ' ').trim().slice(0, 200)
</script>

{#snippet item(text: string, isPinned: boolean)}
  <li>
    <button type="button" class="text" title={text.slice(0, 1000)} onclick={() => copy(text)}>
      {copied === text ? 'Copié' : preview(text)}
    </button>
    <button
      type="button"
      class="pin"
      class:on={isPinned}
      aria-pressed={isPinned}
      aria-label={isPinned ? 'Désépingler' : 'Épingler'}
      onclick={() => pin(text)}
    >
      <PushPinIcon size={14} weight={isPinned ? 'fill' : 'regular'} />
    </button>
  </li>
{/snippet}

<div class="widget">
  <div class="head">
    <span class="label">Presse-papiers</span>
    {#if recent.length}
      <button type="button" class="clear" onclick={() => window.photon.clipboardClear()}>
        Effacer
      </button>
    {/if}
  </div>
  {#if pinned.value.pins.length || recent.length}
    <ul>
      {#each pinned.value.pins as text (text)}{@render item(text, true)}{/each}
      {#each recent as text (text)}{@render item(text, false)}{/each}
    </ul>
  {:else}
    <p class="empty">Copie un texte : il apparaîtra ici.</p>
  {/if}
</div>

<style>
  .widget {
    box-sizing: border-box;
    height: 100%;
    padding: clamp(12px, 9cqmin, 20px);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  .label {
    font-size: var(--text-12);
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
    color: var(--text-faint);
  }

  button {
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }

  .clear {
    padding: 0;
    font-size: var(--text-12);
    color: var(--text-faint);
  }

  .clear:hover {
    color: var(--text);
  }

  ul {
    flex: 1;
    min-height: 0;
    margin: 0;
    padding: 0;
    list-style: none;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  li {
    display: flex;
    align-items: center;
    border-radius: var(--radius-input);
  }

  li:hover {
    background: var(--white-6);
  }

  .text {
    flex: 1;
    min-width: 0;
    padding: 6px 10px;
    text-align: left;
    font-size: var(--text-13);
    color: var(--text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  li:hover .text {
    color: var(--text);
  }

  .pin {
    flex: none;
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    color: var(--text-faint);
    opacity: 0;
  }

  li:hover .pin,
  .pin:focus-visible,
  .pin.on {
    opacity: 1;
  }

  .pin.on {
    color: var(--accent);
  }

  .empty {
    margin: 0;
    font-size: var(--text-13);
    color: var(--text-faint);
  }

  button:focus-visible {
    outline: var(--focus-ring);
    outline-offset: -2px;
  }
</style>
