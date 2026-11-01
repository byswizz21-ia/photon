<script module lang="ts">
  import { app } from '../state.svelte'
  import { widgets } from '../widgets/registry'
  import { createInstance } from './layout'

  // Ids des widgets tout juste ajoutés : la grille leur trouve une place libre.
  // Registre interne, jamais affiché : pas besoin d'un Set réactif.
  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  const placing = new Set<string>()

  export function addWidget(type: string): void {
    const manifest = Object.hasOwn(widgets, type) ? widgets[type] : undefined
    if (!manifest) return
    const instance = createInstance(
      type,
      manifest,
      app.profile.widgets.map((w) => w.id)
    )
    placing.add(instance.id)
    app.profile.widgets.push(instance)
  }
</script>

<script lang="ts">
  import { GridStack, type GridItemHTMLElement, type GridStackWidget } from 'gridstack'
  import 'gridstack/dist/gridstack.min.css'
  import { untrack } from 'svelte'
  import { saveProfile } from '../state.svelte'
  import { COLUMNS, applyLayout } from './layout'
  import WidgetFrame from './WidgetFrame.svelte'

  // Hauteur d'une case et marge par côté (l'écart entre deux cartes vaut le double), en px.
  const CELL = { comfortable: 100, compact: 80 }
  const MARGIN = { comfortable: 10, compact: 6 }

  let grid: GridStack | undefined

  // Seuls les widgets dont le dossier existe s'affichent ; les autres restent dans le profil.
  const items = $derived(app.profile.widgets.filter((w) => Object.hasOwn(widgets, w.type)))

  // Profil affiché par cette grille : remontée à chaque bascule (App.svelte). Pendant son
  // démontage, gridstack signale le retrait des cartes : rien à sauver, le profil a changé.
  const owner = untrack(() => app.profile)

  // Glisser, redimensionner, ajouter, supprimer : on relit la disposition 12 colonnes et on sauve.
  function persist(): void {
    if (!grid || app.profile !== owner) return
    applyLayout(
      app.profile.widgets,
      grid.save(false, false, undefined, COLUMNS) as GridStackWidget[]
    )
    saveProfile()
  }

  // Objet neuf pour gridstack (il le modifie) : jamais l'état Svelte directement.
  function makeItem(el: HTMLElement): void {
    const widget = app.profile.widgets.find((w) => w.id === el.dataset.id)
    const manifest =
      widget && Object.hasOwn(widgets, widget.type) ? widgets[widget.type] : undefined
    if (!grid || !widget || !manifest || (el as GridItemHTMLElement).gridstackNode) return
    const { id, x, y, w, h } = widget
    const { minW, minH } = manifest.size
    grid.makeWidget(el, { id, x, y, w, h, minW, minH, autoPosition: placing.delete(id) })
  }

  function setupGrid(el: HTMLElement): () => void {
    const density = untrack(() => app.theme.density)
    grid =
      GridStack.init(
        {
          column: COLUMNS,
          cellHeight: CELL[density],
          margin: MARGIN[density],
          auto: false,
          // L'animation de gridstack passe par top/left : on s'en passe (transform/opacity seulement).
          animate: false,
          disableDrag: true,
          disableResize: true,
          draggable: { cancel: 'button, input, select, textarea, a, [data-no-drag]' },
          resizable: { handles: 'se' },
          // Poignée visible en permanence en mode édition (sinon seulement au survol de la carte).
          alwaysShowResizeHandle: true,
          // La grille se réorganise selon la largeur (mode fenêtre) ; la disposition 12 est gardée.
          columnOpts: {
            breakpoints: [
              { w: 560, c: 1 },
              { w: 860, c: 6 }
            ]
          }
        },
        el
      ) ?? undefined
    untrack(() => el.querySelectorAll<HTMLElement>(':scope > .grid-stack-item').forEach(makeItem))
    // Écouteurs posés après le premier placement : ouvrir Photon n'écrit rien sur le disque.
    grid?.on('change', persist)
    grid?.on('added', persist)
    grid?.on('removed', persist)
    return () => {
      grid?.destroy(false)
      grid = undefined
    }
  }

  function setupItem(el: HTMLElement): () => void {
    untrack(() => makeItem(el))
    return () => {
      if ((el as GridItemHTMLElement).gridstackNode) grid?.removeWidget(el, false)
    }
  }

  function remove(id: string): void {
    const index = app.profile.widgets.findIndex((w) => w.id === id)
    if (index >= 0) app.profile.widgets.splice(index, 1)
  }

  $effect(() => {
    const editing = app.editing
    untrack(() => {
      grid?.enableMove(editing)
      grid?.enableResize(editing)
    })
  })

  $effect(() => {
    const density = app.theme.density
    untrack(() => {
      grid?.cellHeight(CELL[density])
      grid?.margin(MARGIN[density])
    })
  })
</script>

<div class="grid-stack" data-void {@attach setupGrid}>
  {#each items as widget (widget.id)}
    <div class="grid-stack-item" data-id={widget.id} {@attach setupItem}>
      <div class="grid-stack-item-content">
        <WidgetFrame {widget} manifest={widgets[widget.type]!} onremove={() => remove(widget.id)} />
      </div>
    </div>
  {/each}
</div>

{#if items.length === 0}
  <div class="empty" data-reveal>
    <p>Aucun widget pour l'instant.</p>
    <p class="hint">Clique sur le crayon en haut à droite, puis sur « Ajouter ».</p>
  </div>
{/if}

<style>
  /* La carte se soulève au survol : le conteneur de gridstack ne doit pas la rogner. */
  .grid-stack :global(.grid-stack-item > .grid-stack-item-content) {
    overflow: visible;
  }

  /* Poignée de redimensionnement : un quart d'arc lumineux dans le coin. */
  .grid-stack :global(.ui-resizable-se) {
    transform: none;
    width: 18px;
    height: 18px;
    background: none;
    border-right: 2px solid var(--accent);
    border-bottom: 2px solid var(--accent);
    border-bottom-right-radius: var(--radius);
    opacity: 0.8;
  }

  /* Bascule de profil : la nouvelle grille apparaît en fondu. */
  .grid-stack {
    animation: fade-in var(--dur-fade) var(--ease-out);
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
  }

  .empty {
    padding: 48px 24px;
    text-align: center;
    color: var(--text-muted);
  }

  .empty p {
    margin: 0;
  }

  .hint {
    margin-top: 6px !important;
    font-size: var(--text-13);
    color: var(--text-faint);
  }
</style>
