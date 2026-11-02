<script lang="ts">
  // Catalogue : tous les widgets par rubrique, et l'aperçu en direct de celui choisi (vraies
  // données, inactif : aucun clic ne part à Windows). « Ajouter » le pose dans la grille.
  import MagnifyingGlassIcon from 'phosphor-svelte/lib/MagnifyingGlassIcon'
  import PlusIcon from 'phosphor-svelte/lib/PlusIcon'
  import XIcon from 'phosphor-svelte/lib/XIcon'
  import { app } from '../state.svelte'
  import { groupWidgets, searchWidgets, type WidgetEntry } from '../widgets/catalog'
  import { widgets } from '../widgets/registry'
  import { CATEGORIES } from '../widgets/types'
  import { addWidget, CELL, MARGIN } from './Grid.svelte'
  import { createInstance } from './layout'
  import WidgetFrame from './WidgetFrame.svelte'

  let { onclose }: { onclose: () => void } = $props()

  const groups = groupWidgets(widgets)
  let query = $state('')
  let selected = $state(groups[0]?.entries[0]?.type ?? '')
  let stage = $state({ width: 0, height: 0 })
  let search: HTMLInputElement
  let detail = $state<HTMLElement>()

  const results = $derived(searchWidgets(widgets, query))
  const shown = $derived(
    query.trim() ? [{ category: 'search', label: 'Résultats', entries: results }] : groups
  )
  const manifest = $derived(widgets[selected])
  const instance = $derived(manifest ? createInstance(selected, manifest, []) : null)

  // Carte à sa taille par défaut dans la grille (colonne ≈ hauteur d'une case), réduite pour tenir.
  const card = $derived.by(() => {
    const density = app.theme.density
    const cell = (n: number): number => n * CELL[density] - 2 * MARGIN[density]
    const width = cell(manifest?.size.w ?? 1)
    const height = cell(manifest?.size.h ?? 1)
    const scale = Math.min(1, stage.width / width, stage.height / height) || 1
    return { width, height, scale }
  })

  $effect(() => {
    search.focus()
  })

  // Fenêtre étroite : l'aperçu est au-dessus de la liste, on y remonte.
  function select(type: string): void {
    selected = type
    detail?.scrollIntoView({ block: 'nearest' })
  }

  function add(type: string): void {
    addWidget(type)
    onclose()
  }
</script>

{#snippet tile(entry: WidgetEntry)}
  <li>
    <button
      type="button"
      class="tile"
      aria-pressed={entry.type === selected}
      onclick={() => select(entry.type)}
      ondblclick={() => add(entry.type)}
    >
      <entry.manifest.icon size={22} weight="duotone" color="var(--accent)" aria-hidden="true" />
      <span class="name">{entry.manifest.name}</span>
      <span class="desc">{entry.manifest.description}</span>
    </button>
  </li>
{/snippet}

<div class="catalog" role="dialog" aria-modal="true" aria-labelledby="catalog-title">
  <header class="head">
    <h2 id="catalog-title">
      Tous les widgets <span class="count">{Object.keys(widgets).length}</span>
    </h2>
    <label class="search">
      <MagnifyingGlassIcon size={16} aria-hidden="true" />
      <input
        bind:this={search}
        bind:value={query}
        type="text"
        placeholder="Chercher un widget"
        aria-label="Chercher un widget"
        onkeydown={(event) => {
          if (event.key === 'Enter' && results[0]) select(results[0].type)
        }}
      />
    </label>
    <button type="button" class="action icon" aria-label="Fermer le catalogue" onclick={onclose}>
      <XIcon size={16} weight="bold" aria-hidden="true" />
    </button>
  </header>

  <div class="body">
    <div class="list">
      {#each shown as group (group.category)}
        <section aria-label={group.label}>
          <h3>{group.label}</h3>
          {#if group.entries.length}
            <ul>
              {#each group.entries as entry (entry.type)}{@render tile(entry)}{/each}
            </ul>
          {:else}
            <p class="empty">Aucun widget ne correspond.</p>
          {/if}
        </section>
      {/each}
    </div>

    {#if manifest && instance}
      <aside class="detail" bind:this={detail} aria-label="Aperçu de {manifest.name}">
        <div class="stage" bind:clientWidth={stage.width} bind:clientHeight={stage.height}>
          <div
            class="preview"
            inert
            style:width="{card.width}px"
            style:height="{card.height}px"
            style:transform="translate(-50%, -50%) scale({card.scale})"
          >
            {#key selected}<WidgetFrame widget={instance} {manifest} preview />{/key}
          </div>
        </div>
        <div class="info">
          <span class="chip">{CATEGORIES[manifest.category]}</span>
          <h3 class="title">
            <manifest.icon size={22} weight="duotone" color="var(--accent)" aria-hidden="true" />
            {manifest.name}
          </h3>
          <p>{manifest.description}</p>
          <p class="hint">
            {manifest.size.w} × {manifest.size.h} cases au départ, redimensionnable. Réglages : en mode
            édition, dans le widget.
          </p>
          <button type="button" class="action primary" onclick={() => add(selected)}>
            <PlusIcon size={16} weight="bold" aria-hidden="true" />
            Ajouter à la grille
          </button>
        </div>
      </aside>
    {/if}
  </div>
</div>

<style>
  /* Grand tiroir de verre sur tout le panneau. no-drag : il recouvre la barre qui déplace la fenêtre. */
  .catalog {
    position: absolute;
    inset: 12px;
    max-width: 1280px;
    max-height: 900px;
    margin: auto;
    z-index: 20;
    box-sizing: border-box;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    border: 1px solid var(--glass-edge);
    border-radius: var(--radius-panel);
    background: var(--glass-sheen), var(--drawer-bg-solid);
    backdrop-filter: var(--glass-filter-drawer);
    box-shadow: var(--shadow-popover);
    -webkit-app-region: no-drag;
    container-type: inline-size;
    animation: open var(--dur-reveal) var(--ease-out);
  }

  @keyframes open {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
  }

  .head {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  h2 {
    margin: 0;
    font-size: var(--text-18);
    font-weight: var(--weight-semibold);
    letter-spacing: var(--tracking-title);
    white-space: nowrap;
  }

  .count {
    font-size: var(--text-13);
    font-weight: var(--weight-medium);
    color: var(--text-faint);
  }

  .search {
    flex: 1;
    max-width: 320px;
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 12px;
    min-height: 36px;
    border-radius: var(--radius-pill);
    background: var(--surface-field);
    color: var(--text-faint);
  }

  .search:focus-within {
    outline: var(--focus-ring);
    outline-offset: var(--focus-offset);
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

  .body {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(300px, 420px);
    gap: 20px;
  }

  .list {
    min-height: 0;
    overflow-y: auto;
    padding-right: 4px;
  }

  section + section {
    margin-top: 18px;
  }

  h3 {
    margin: 0 0 8px;
    font-size: var(--text-12);
    font-weight: var(--weight-semibold);
    text-transform: uppercase;
    letter-spacing: var(--tracking-label);
    color: var(--text-faint);
  }

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 8px;
  }

  .tile {
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 4px 10px;
    padding: 12px;
    border: 1px solid var(--line);
    border-radius: var(--radius-tile);
    background: var(--white-4);
    text-align: left;
    cursor: pointer;
    transition: transform var(--dur-spring) var(--ease-spring);
  }

  .tile:hover {
    background: var(--surface-hover);
  }

  .tile:active {
    transform: scale(0.97);
    transition-duration: var(--dur-press);
  }

  .tile[aria-pressed='true'] {
    border-color: color-mix(in srgb, var(--accent) 55%, transparent);
    background: var(--surface-accent-soft);
  }

  .tile .name {
    font-size: var(--text-13);
    font-weight: var(--weight-semibold);
  }

  .tile .desc {
    grid-column: 1 / -1;
    font-size: var(--text-12);
    color: var(--text-muted);
  }

  .empty {
    margin: 0;
    font-size: var(--text-13);
    color: var(--text-muted);
  }

  .detail {
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 16px;
    overflow-y: auto;
  }

  /* Scène de l'aperçu : la carte y est centrée, réduite par transform si elle ne tient pas. */
  .stage {
    position: relative;
    flex: none;
    height: min(46vh, 360px);
    border-radius: var(--radius-tile);
    background: var(--black-20);
    overflow: hidden;
  }

  .preview {
    position: absolute;
    left: 50%;
    top: 50%;
    transform-origin: center;
  }

  .info {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .chip {
    padding: 2px 10px;
    border-radius: var(--radius-pill);
    background: var(--surface-accent-soft);
    color: var(--accent);
    font-size: var(--text-12);
    font-weight: var(--weight-medium);
  }

  .title {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    font-size: var(--text-18);
    text-transform: none;
    letter-spacing: var(--tracking-title);
    color: var(--text);
  }

  .info p {
    margin: 0;
    font-size: var(--text-14);
    color: var(--text-secondary);
  }

  .info .hint {
    font-size: var(--text-12);
    color: var(--text-faint);
  }

  .info .action {
    margin-top: 6px;
  }

  /* Fenêtre étroite : l'aperçu passe au-dessus de la liste. */
  @container (max-width: 760px) {
    .body {
      display: flex;
      flex-direction: column;
      overflow-y: auto;
    }

    .detail {
      order: -1;
    }

    .list,
    .detail {
      flex: none;
      overflow: visible;
    }
  }
</style>
