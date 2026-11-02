<script lang="ts">
  // Menu « Ajouter » du mode édition : recherche, widgets rangés par rubrique avec ce qu'ils font,
  // et lien vers le catalogue qui les montre en aperçu.
  import MagnifyingGlassIcon from 'phosphor-svelte/lib/MagnifyingGlassIcon'
  import PlusIcon from 'phosphor-svelte/lib/PlusIcon'
  import SquaresFourIcon from 'phosphor-svelte/lib/SquaresFourIcon'
  import { groupWidgets, searchWidgets, type WidgetEntry } from '../widgets/catalog'
  import { widgets } from '../widgets/registry'
  import { addWidget } from './Grid.svelte'

  let { oncatalog }: { oncatalog: () => void } = $props()

  let open = $state(false)
  let query = $state('')
  let box = $state<HTMLElement>()
  let trigger = $state<HTMLButtonElement>()
  let input = $state<HTMLInputElement>()

  const groups = groupWidgets(widgets) // fixe : tous les widgets sont chargés d'avance
  const results = $derived(searchWidgets(widgets, query))
  const searching = $derived(query.trim() !== '')

  // Hauteur de la liste : ce qui reste sous le bouton dans le panneau (qui couperait le menu).
  let room = $state(480)

  $effect(() => {
    if (!open || !box) return
    const panel = box.closest('main')?.getBoundingClientRect().bottom ?? window.innerHeight
    room = Math.max(160, Math.min(480, panel - box.getBoundingClientRect().bottom - 120))
    input?.focus()
  })

  function close(): void {
    open = false
    query = ''
  }

  function pick(type: string): void {
    addWidget(type)
    close()
  }

  // Échap ferme le menu seulement (sans quitter le mode édition) ; Entrée ajoute le 1er résultat.
  function onKeydown(event: KeyboardEvent): void {
    if (!open || event.key !== 'Escape') return
    event.stopPropagation()
    close()
    trigger?.focus()
  }
</script>

<!-- Clic ailleurs : le menu se ferme. -->
<svelte:window
  onkeydowncapture={onKeydown}
  onpointerdown={(event) => {
    if (open && !box?.contains(event.target as Node)) close()
  }}
/>

{#snippet row(entry: WidgetEntry)}
  <li>
    <button type="button" class="item" onclick={() => pick(entry.type)}>
      <entry.manifest.icon size={20} weight="duotone" color="var(--accent)" aria-hidden="true" />
      <span class="text">
        <span class="name">{entry.manifest.name}</span>
        <span class="desc">{entry.manifest.description}</span>
      </span>
    </button>
  </li>
{/snippet}

<div class="add" bind:this={box}>
  <button
    type="button"
    class="action"
    bind:this={trigger}
    aria-haspopup="dialog"
    aria-expanded={open}
    onclick={() => (open ? close() : (open = true))}
  >
    <PlusIcon size={16} weight="bold" aria-hidden="true" />
    Ajouter
  </button>
  {#if open}
    <div class="menu picker" role="dialog" aria-label="Ajouter un widget">
      <label class="search">
        <MagnifyingGlassIcon size={16} aria-hidden="true" />
        <input
          bind:this={input}
          bind:value={query}
          type="text"
          placeholder="Chercher un widget"
          aria-label="Chercher un widget"
          onkeydown={(event) => {
            if (event.key === 'Enter' && results[0]) pick(results[0].type)
          }}
        />
      </label>
      <div class="list" style:max-height="{room}px">
        {#if searching}
          {#if results.length}
            <ul>
              {#each results as entry (entry.type)}{@render row(entry)}{/each}
            </ul>
          {:else}
            <p class="empty">Aucun widget ne correspond.</p>
          {/if}
        {:else}
          {#each groups as group (group.category)}
            <section aria-label={group.label}>
              <h3>{group.label}</h3>
              <ul>
                {#each group.entries as entry (entry.type)}{@render row(entry)}{/each}
              </ul>
            </section>
          {/each}
        {/if}
      </div>
      <button
        type="button"
        class="all"
        onclick={() => {
          close()
          oncatalog()
        }}
      >
        <SquaresFourIcon size={18} weight="duotone" aria-hidden="true" />
        Voir tous les widgets en aperçu
      </button>
    </div>
  {/if}
</div>

<style>
  .add {
    position: relative;
  }

  /* Fond presque opaque : la liste est longue et le verre laisserait lire les widgets dessous. */
  .picker {
    z-index: 110; /* au-dessus des poignées de redimensionnement de gridstack (100) */
    background: var(--glass-sheen), var(--menu-bg-solid);
    width: min(360px, calc(100vw - 48px));
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .search {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 12px;
    min-height: 40px;
    border-radius: var(--radius-input);
    background: var(--surface-field);
    color: var(--text-faint);
  }

  .search input {
    flex: 1;
    min-width: 0;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--text);
    font: inherit;
    font-size: var(--text-13);
  }

  .search:focus-within {
    outline: var(--focus-ring);
    outline-offset: var(--focus-offset);
  }

  .list {
    overflow-y: auto;
  }

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  h3 {
    margin: 10px 12px 4px;
    font-size: var(--text-11);
    font-weight: var(--weight-semibold);
    text-transform: uppercase;
    letter-spacing: var(--tracking-menu-label);
    color: var(--text-faint);
  }

  .item {
    min-height: 52px;
    padding: 6px 12px;
  }

  .text {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .name {
    font-size: var(--text-13);
    font-weight: var(--weight-medium);
  }

  .desc {
    font-size: var(--text-12);
    color: var(--text-muted);
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
  }

  .empty {
    margin: 12px;
    font-size: var(--text-13);
    color: var(--text-muted);
  }

  .all {
    border-top: 1px solid var(--line);
    border-radius: 0 0 var(--radius-input) var(--radius-input);
    font-size: var(--text-13);
    font-weight: var(--weight-medium);
    color: var(--accent);
  }
</style>
