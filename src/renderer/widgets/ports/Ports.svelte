<script lang="ts">
  // Une ligne par port : numéro, programme, « local » ou « réseau », croix pour le fermer.
  // Mode édition : montrer aussi les ports de Windows (jamais fermables).
  import XIcon from 'phosphor-svelte/lib/XIcon'
  import type { PortInfo } from '../../../shared/api'
  import { pollWhileVisible } from '../../lib/poll.svelte'
  import type { WidgetProps } from '../types'
  import type { PortsSettings } from './manifest'

  let { settings, editing, save }: WidgetProps<PortsSettings> = $props()

  let list: PortInfo[] | null = $state([])
  pollWhileVisible(async () => (list = await window.photon.ports()), 3_000)

  const shown = $derived((list ?? []).filter((p) => settings.all || p.closable))
  let closing = $state<number | null>(null)

  async function close(pid: number): Promise<void> {
    closing = pid
    await window.photon.portClose(pid)
    list = await window.photon.ports()
    closing = null
  }
</script>

<div class="widget">
  <div class="head">
    <span class="label">Ports</span>
    {#if editing}
      <label class="option" data-no-drag>
        <input
          type="checkbox"
          checked={settings.all}
          onchange={(event) => save({ ...settings, all: event.currentTarget.checked })}
        />
        Ports de Windows aussi
      </label>
    {:else}
      <span class="count">{shown.length} en écoute</span>
    {/if}
  </div>
  {#if list === null}
    <p class="empty">Lecture des ports impossible</p>
  {:else if !shown.length}
    <p class="empty">Aucun programme n'écoute</p>
  {:else}
    <ul>
      {#each shown as p (`${p.port}/${p.pid}`)}
        <li class:closing={closing === p.pid}>
          <span class="port">{p.port}</span>
          <span class="name" title="pid {p.pid}">{p.name}</span>
          <span class="where" title={p.local ? 'Seulement depuis ce PC' : 'Visible sur le réseau'}
            >{p.local ? 'local' : 'réseau'}</span
          >
          {#if p.closable}
            <button
              type="button"
              class="close"
              aria-label="Fermer {p.name} (port {p.port})"
              disabled={closing !== null}
              onclick={() => close(p.pid)}
            >
              <XIcon size={12} aria-hidden="true" />
            </button>
          {:else}
            <span></span>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .widget {
    box-sizing: border-box;
    height: 100%;
    padding: clamp(12px, 8cqmin, 20px);
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow: hidden;
  }

  .head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
  }

  .label {
    font-size: var(--text-12);
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
    color: var(--text-faint);
  }

  .count {
    font-size: var(--text-12);
    color: var(--text-faint);
  }

  .option {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: var(--text-12);
    color: var(--text-muted);
    cursor: pointer;
  }

  .option input {
    margin: 0;
    accent-color: var(--accent);
  }

  .empty {
    margin: auto 0;
    font-size: var(--text-13);
    color: var(--text-faint);
    text-align: center;
  }

  ul {
    flex: 1;
    min-height: 0;
    margin: 0;
    padding: 0;
    list-style: none;
    overflow-y: auto;
  }

  li {
    display: grid;
    grid-template-columns: 56px minmax(0, 1fr) auto 24px;
    align-items: center;
    gap: 8px;
    min-height: 28px;
    transition: opacity var(--dur-fast) var(--ease-out);
  }

  li.closing {
    opacity: 0.4;
  }

  .port {
    font-size: var(--text-15);
    font-variant-numeric: tabular-nums;
    font-weight: var(--weight-medium);
  }

  .name {
    font-size: var(--text-13);
    color: var(--text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .where {
    font-size: var(--text-11);
    color: var(--text-faint);
  }

  .close {
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: none;
    color: var(--text-faint);
    cursor: pointer;
    opacity: 0;
  }

  li:hover .close,
  .close:focus-visible {
    opacity: 1;
  }

  .close:hover {
    color: var(--danger-text);
    background: var(--danger-surface);
  }

  .close:focus-visible {
    outline: var(--focus-ring);
    outline-offset: var(--focus-offset);
  }
</style>
