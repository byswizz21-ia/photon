<script lang="ts">
  // Taille et nombre d'éléments de la corbeille, relus toutes les 10 s fenêtre visible.
  // « Vider » demande une confirmation (2e clic dans les 4 s) : c'est définitif.
  import ArrowSquareOutIcon from 'phosphor-svelte/lib/ArrowSquareOutIcon'
  import TrashIcon from 'phosphor-svelte/lib/TrashIcon'
  import type { TrashState } from '../../../shared/api'
  import { pollWhileVisible } from '../../lib/poll.svelte'
  import type { WidgetProps } from '../types'
  import type { TrashSettings } from './manifest'

  let { preview }: WidgetProps<TrashSettings> = $props()

  let bin = $state<TrashState | null | undefined>()
  let confirming = $state(false)
  let emptying = $state(false)
  let timer: ReturnType<typeof setTimeout> | undefined

  pollWhileVisible(async () => {
    if (!emptying) bin = await window.photon.trash()
  }, 10_000)

  // 1 Go = 1024³ octets, comme l'Explorateur.
  function size(bytes: number): string {
    const units = ['octets', 'Ko', 'Mo', 'Go', 'To']
    let value = bytes
    let unit = 0
    while (value >= 1024 && unit < units.length - 1) {
      value /= 1024
      unit++
    }
    const text = unit === 0 || value >= 100 ? String(Math.round(value)) : value.toFixed(1)
    return `${text.replace('.', ',')} ${units[unit]}`
  }

  async function empty(): Promise<void> {
    clearTimeout(timer)
    if (preview) return
    if (!confirming) {
      confirming = true
      timer = setTimeout(() => (confirming = false), 4000)
      return
    }
    confirming = false
    emptying = true
    bin = await window.photon.trashEmpty()
    emptying = false
  }

  $effect(() => () => clearTimeout(timer))
</script>

<div class="w-body">
  <div class="w-head">
    <span class="w-label">Corbeille</span>
    <button
      type="button"
      class="w-icon"
      aria-label="Ouvrir la corbeille"
      title="Ouvrir la corbeille"
      onclick={() => window.photon.trashOpen()}
    >
      <ArrowSquareOutIcon size={14} aria-hidden="true" />
    </button>
  </div>

  {#if bin === undefined}
    <p class="w-message">Lecture…</p>
  {:else if bin === null}
    <p class="w-message">Corbeille illisible</p>
  {:else}
    <div class="main">
      <TrashIcon
        size={34}
        weight={bin.count ? 'fill' : 'regular'}
        color={bin.count ? 'var(--accent)' : 'var(--text-faint)'}
        aria-hidden="true"
      />
      <div>
        <p class="size">{bin.count ? size(bin.bytes) : 'Vide'}</p>
        {#if bin.count}
          <p class="w-hint">{bin.count} élément{bin.count > 1 ? 's' : ''}</p>
        {/if}
      </div>
    </div>
    {#if bin.count}
      <button
        type="button"
        class="action empty"
        class:confirm={confirming}
        disabled={emptying}
        onclick={empty}
      >
        {emptying ? 'Vidage…' : confirming ? 'Vraiment ? Clic pour vider' : 'Vider'}
      </button>
    {/if}
  {/if}
</div>

<style>
  .main {
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  p {
    margin: 0;
  }

  .size {
    font-size: clamp(20px, 14cqmin, 32px);
    font-weight: var(--weight-light);
    line-height: 1.1;
    white-space: nowrap;
  }

  .empty {
    justify-content: center;
  }

  .empty.confirm {
    border-color: var(--danger-border);
    background: var(--danger-surface);
    color: var(--danger-text-strong);
  }

  .empty:disabled {
    opacity: 0.6;
    cursor: default;
  }

  /* Carte d'une case de haut : taille et bouton côte à côte. */
  @container (max-height: 110px) {
    .w-body {
      flex-direction: row;
      align-items: center;
    }
    .w-head {
      display: none;
    }
    .main :global(svg) {
      display: none;
    }
  }
</style>
