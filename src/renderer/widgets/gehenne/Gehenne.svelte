<script lang="ts">
  // Top des programmes par CPU, relu toutes les 2 s fenêtre visible. × : 1er clic « Purger ? »,
  // 2e clic ferme le programme (fenêtres fermées comme avec la croix, « Enregistrer ? » reste
  // proposé). Programmes protégés (Windows, Photon) : pas de bouton.
  import XIcon from 'phosphor-svelte/lib/XIcon'
  import type { ProcessGroup } from '../../../shared/api'
  import { bytes, percent } from '../../lib/format'
  import { pollWhileVisible } from '../../lib/poll.svelte'
  import type { WidgetProps } from '../types'
  import type { GehenneSettings } from './manifest'

  let { preview }: WidgetProps<GehenneSettings> = $props()

  let list = $state.raw<ProcessGroup[] | null>(null)
  let failed = $state(false)
  let armed = $state('') // nom en attente du 2e clic

  const read = async (): Promise<void> => {
    const next = await window.photon.processes('cpu')
    if (next) list = next
    failed = !next && !list
  }
  pollWhileVisible(read, 2_000)

  // Le 1er clic n'arme que quelques secondes.
  $effect(() => {
    if (!armed) return
    const timer = setTimeout(() => (armed = ''), 4_000)
    return () => clearTimeout(timer)
  })

  async function purge(name: string): Promise<void> {
    if (preview) return
    if (armed !== name) {
      armed = name
      return
    }
    armed = ''
    await window.photon.processClose(name)
    setTimeout(() => void read(), 800) // le temps que le programme se ferme
  }

  const total = $derived((list ?? []).reduce((sum, p) => sum + p.cpu, 0))
</script>

<div class="w-body">
  <div class="w-head">
    <span class="w-label title"><kbd class="w-kbd">Z</kbd>Géhenne</span>
    {#if list}<span class="total">{percent(total)} CPU</span>{/if}
  </div>

  {#if list?.length}
    <ul class="w-list">
      {#each list as proc (proc.name)}
        <li class:armed={armed === proc.name}>
          <span class="text">
            <span class="name" title="{proc.name}.exe">
              {proc.label}{#if proc.count > 1}<span class="count">×{proc.count}</span>{/if}
            </span>
            <span class="detail">{percent(proc.cpu)} · {bytes(proc.memory)}</span>
          </span>
          {#if proc.closable}
            <button
              type="button"
              class="purge"
              aria-label={armed === proc.name
                ? `Confirmer : purger ${proc.label}`
                : `Purger ${proc.label}`}
              title={armed === proc.name ? 'Cliquer encore pour purger' : 'Purger'}
              data-no-drag
              onclick={() => purge(proc.name)}
            >
              {#if armed === proc.name}Purger ?{:else}<XIcon
                  size={14}
                  weight="bold"
                  aria-hidden="true"
                />{/if}
            </button>
          {/if}
        </li>
      {/each}
    </ul>
  {:else}
    <p class="w-message">
      {failed ? 'Lecture impossible' : list ? 'Rien à purger' : 'Lecture des processus…'}
    </p>
  {/if}
</div>

<style>
  .title {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .total {
    font-size: var(--text-12);
    color: var(--text-faint);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  li {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 2px 6px 8px;
    border-radius: var(--radius-row);
  }

  li:hover {
    background: var(--surface-hover);
  }

  .text {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .name,
  .detail {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .name {
    font-size: var(--text-13);
  }

  .count {
    margin-left: 6px;
    font-size: var(--text-11);
    color: var(--text-faint);
  }

  .detail {
    font-size: var(--text-11);
    color: var(--text-faint);
    font-variant-numeric: tabular-nums;
  }

  .purge {
    flex: none;
    min-width: 26px;
    height: 26px;
    display: grid;
    place-items: center;
    padding: 0 6px;
    border: 0;
    border-radius: var(--radius-pill);
    background: none;
    color: var(--text-faint);
    font: inherit;
    font-size: var(--text-11);
    cursor: pointer;
  }

  .purge:hover,
  .armed .purge {
    background: var(--danger-surface);
    color: var(--danger-text);
  }

  .purge:focus-visible {
    outline: var(--focus-ring);
    outline-offset: var(--focus-offset);
  }
</style>
