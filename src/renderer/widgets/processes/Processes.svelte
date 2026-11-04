<script lang="ts">
  // Top 10 des programmes (processus regroupés par nom), triés par CPU ou RAM, relus toutes les
  // 2 s fenêtre visible. Croix au survol : 1er clic « Fermer ? », 2e clic ferme le programme
  // (fenêtres fermées comme avec la croix, donc « Enregistrer ? » reste proposé).
  import CpuIcon from 'phosphor-svelte/lib/CpuIcon'
  import XIcon from 'phosphor-svelte/lib/XIcon'
  import type { ProcessGroup } from '../../../shared/api'
  import { bytes, percent } from '../../lib/format'
  import { pollWhileVisible } from '../../lib/poll.svelte'
  import type { WidgetProps } from '../types'
  import type { ProcessesSettings } from './manifest'

  let { settings, save }: WidgetProps<ProcessesSettings> = $props()

  const sort = $derived(settings.sort === 'ram' ? 'ram' : 'cpu')
  let list = $state.raw<ProcessGroup[] | null>(null)
  let failed = $state(false)
  let armed = $state('') // nom en attente du 2e clic

  const read = async (): Promise<void> => {
    const next = await window.photon.processes(sort)
    if (next) list = next
    failed = !next && !list
  }
  pollWhileVisible(read, 2_000)

  // Tri changé : relecture tout de suite, pas au prochain tour.
  $effect(() => {
    void sort
    void read()
  })

  // Icônes des exécutables, demandées une fois par nom.
  let icons = $state<Record<string, string | null>>({})
  $effect(() => {
    for (const { name } of list ?? []) {
      if (name in icons) continue
      icons[name] = null
      void window.photon.processIcon(name).then((icon) => (icons[name] = icon))
    }
  })

  // Le 1er clic n'arme que quelques secondes.
  $effect(() => {
    if (!armed) return
    const timer = setTimeout(() => (armed = ''), 4_000)
    return () => clearTimeout(timer)
  })

  async function close(name: string): Promise<void> {
    if (armed !== name) {
      armed = name
      return
    }
    armed = ''
    await window.photon.processClose(name)
    setTimeout(() => void read(), 800) // le temps que le programme se ferme
  }

  // Barre relative au premier de la liste.
  const top = $derived(Math.max(1, ...(list ?? []).map((p) => (sort === 'cpu' ? p.cpu : p.memory))))
</script>

<div class="widget">
  <div class="head">
    <span class="label">Processus</span>
    <div class="tabs" role="group" aria-label="Trier par" data-no-drag>
      {#each [['cpu', 'CPU'], ['ram', 'RAM']] as const as [value, text] (value)}
        <button
          type="button"
          class:on={sort === value}
          aria-pressed={sort === value}
          onclick={() => save({ ...settings, sort: value })}>{text}</button
        >
      {/each}
    </div>
  </div>

  {#if list?.length}
    <ul>
      {#each list as proc (proc.name)}
        <li class:armed={armed === proc.name}>
          <span class="icon">
            {#if icons[proc.name]}<img src={icons[proc.name]} alt="" />{:else}<CpuIcon
                size={16}
                aria-hidden="true"
              />{/if}
          </span>
          <span class="name" title="{proc.name}.exe">
            {proc.label}{#if proc.count > 1}<span class="count">×{proc.count}</span>{/if}
          </span>
          <span class="value">{sort === 'cpu' ? percent(proc.cpu) : bytes(proc.memory)}</span>
          {#if proc.closable}
            <button
              type="button"
              class="close"
              aria-label={armed === proc.name
                ? `Confirmer : fermer ${proc.label}`
                : `Fermer ${proc.label}`}
              title={armed === proc.name ? 'Cliquer encore pour fermer' : 'Fermer'}
              data-no-drag
              onclick={() => close(proc.name)}
            >
              {#if armed === proc.name}Fermer ?{:else}<XIcon size={12} aria-hidden="true" />{/if}
            </button>
          {/if}
          <span class="bar">
            <span
              class="level"
              style:transform="scaleX({(sort === 'cpu' ? proc.cpu : proc.memory) / top})"
            ></span>
          </span>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="empty">{failed ? 'Lecture impossible' : 'Lecture des processus…'}</p>
  {/if}
</div>

<style>
  .widget {
    box-sizing: border-box;
    height: 100%;
    padding: clamp(12px, 7cqmin, 20px);
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .label {
    font-size: var(--text-12);
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
    color: var(--text-faint);
  }

  .tabs {
    display: flex;
    padding: 2px;
    border-radius: var(--radius-pill);
    background: var(--white-5);
  }

  .tabs button {
    min-height: 22px;
    padding: 0 10px;
    border: none;
    border-radius: var(--radius-pill);
    background: none;
    color: var(--text-faint);
    font: inherit;
    font-size: var(--text-11);
    cursor: pointer;
  }

  .tabs button.on {
    background: var(--white-12);
    color: var(--text);
  }

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow: hidden;
  }

  li {
    display: grid;
    grid-template-columns: 20px 1fr auto auto;
    align-items: center;
    gap: 4px 8px;
  }

  .icon {
    display: grid;
    place-items: center;
    color: var(--text-faint);
  }

  .icon img {
    width: 18px;
    height: 18px;
  }

  .name {
    min-width: 0;
    font-size: var(--text-13);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .count {
    margin-left: 6px;
    font-size: var(--text-11);
    color: var(--text-faint);
  }

  .value {
    font-size: var(--text-12);
    font-variant-numeric: tabular-nums;
    color: var(--text-muted);
  }

  .bar {
    grid-column: 2 / -1;
    height: 3px;
    border-radius: var(--radius-bar);
    overflow: hidden;
    background: var(--white-8);
  }

  /* Remplissage : seulement scaleX depuis la gauche (comme les jauges du widget Système). */
  .level {
    display: block;
    height: 100%;
    background: var(--accent);
    transform-origin: left;
    transition: transform var(--dur-fill) var(--ease-out);
  }

  .close {
    grid-column: 4;
    display: grid;
    place-items: center;
    min-width: 20px;
    height: 20px;
    padding: 0 4px;
    border: none;
    border-radius: var(--radius-pill);
    background: none;
    color: var(--text-faint);
    font: inherit;
    font-size: var(--text-11);
    cursor: pointer;
    opacity: 0;
    transition: opacity var(--dur-fast) var(--ease-out);
  }

  li:hover .close,
  .close:focus-visible,
  .armed .close {
    opacity: 1;
  }

  .close:hover {
    background: var(--white-8);
    color: var(--text);
  }

  .armed .close {
    background: var(--danger-surface);
    color: var(--danger-text);
  }

  button:focus-visible {
    outline: var(--focus-ring);
    outline-offset: var(--focus-offset);
  }

  .empty {
    margin: 0;
    font-size: var(--text-13);
    color: var(--text-faint);
  }
</style>
