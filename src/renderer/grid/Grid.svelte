<script module lang="ts">
  import { play } from '../sound.svelte'
  import { app } from '../state.svelte'
  import { widgets } from '../widgets/registry'
  import type { GridStack as Stack } from 'gridstack'
  import { COLUMNS as GRID_COLUMNS, createInstance } from './layout'

  // Ids des widgets tout juste ajoutés : la grille leur trouve une place libre.
  // Registre interne, jamais affiché : pas besoin d'un Set réactif.
  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  const placing = new Set<string>()

  // Hauteur d'une case et marge par côté (l'écart entre deux cartes vaut le double), en px.
  export const CELL = { comfortable: 100, compact: 80 }
  export const MARGIN = { comfortable: 10, compact: 6 }

  // Grille affichée (une seule à la fois) : pour viser une case au clic droit.
  let active: Stack | undefined

  export interface Cell {
    x: number
    y: number
  }

  // Case de la grille sous ce point de l'écran ; null hors de la grille ou en colonnes réduites
  // (fenêtre étroite : les positions ne sont plus celles du profil).
  export function cellAt(clientX: number, clientY: number): Cell | null {
    if (!active || active.getColumn() !== GRID_COLUMNS) return null
    const box = active.el.getBoundingClientRect()
    const x = Math.floor((clientX - box.left) / active.cellWidth())
    const y = Math.floor((clientY - box.top) / active.getCellHeight())
    return x >= 0 && x < GRID_COLUMNS && y >= 0 ? { x, y } : null
  }

  // Sans case (ou case déjà prise) : la grille lui trouve la première place libre.
  export function addWidget(type: string, cell: Cell | null = null): void {
    const manifest = Object.hasOwn(widgets, type) ? widgets[type] : undefined
    if (!manifest) return
    const instance = createInstance(
      type,
      manifest,
      app.profile.widgets.map((w) => w.id)
    )
    const x = cell ? Math.min(cell.x, GRID_COLUMNS - instance.w) : 0
    if (cell && active?.isAreaEmpty(x, cell.y, instance.w, instance.h)) {
      instance.x = x
      instance.y = cell.y
    } else placing.add(instance.id)
    app.profile.widgets.push(instance)
    play('add')
  }
</script>

<script lang="ts">
  import { GridStack, type GridItemHTMLElement, type GridStackWidget } from 'gridstack'
  import 'gridstack/dist/gridstack.min.css'
  import { tick, untrack } from 'svelte'
  import type { WidgetInstance } from '../../shared/model'
  import { saveProfile } from '../state.svelte'
  import type { WidgetManifest } from '../widgets/types'
  import { COLUMNS, applyLayout, cellsFor, mergeSettings } from './layout'
  import WidgetFrame from './WidgetFrame.svelte'

  let grid: GridStack | undefined

  // Seuls les widgets dont le dossier existe s'affichent ; les autres restent dans le profil.
  const items = $derived(app.profile.widgets.filter((w) => Object.hasOwn(widgets, w.type)))

  // Profil affiché par cette grille : remontée à chaque bascule (App.svelte). Une sauvegarde qui
  // arrive après la bascule (glisser fini juste avant) ne touche pas le nouveau profil.
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

  // Taille minimale d'une carte en cases : celle du manifest, ou plus si ses réglages demandent de
  // la place en px (manifest.minSize), convertie avec la taille actuelle des cases.
  function minCells(
    widget: WidgetInstance,
    manifest: WidgetManifest
  ): { minW: number; minH: number } {
    const { minW, minH } = manifest.size
    const px = manifest.minSize?.(mergeSettings(manifest.defaults, widget.settings))
    if (!grid || !px) return { minW, minH }
    const density = app.theme.density
    return {
      minW: Math.min(
        grid.getColumn(),
        Math.max(minW, cellsFor(px.width, grid.cellWidth(), MARGIN[density]))
      ),
      minH: Math.max(minH, cellsFor(px.height, CELL[density], MARGIN[density]))
    }
  }

  // Nouveau minimum : la carte grandit tout de suite si besoin et ne descend plus en dessous.
  function fitMin(id: string, { minW, minH }: { minW: number; minH: number }): void {
    const el = grid?.el.querySelector<GridItemHTMLElement>(`[data-id="${CSS.escape(id)}"]`)
    const node = el?.gridstackNode
    if (!grid || !el || !node || (node.minW === minW && node.minH === minH)) return
    const w = Math.max(node.w ?? minW, minW)
    const h = Math.max(node.h ?? minH, minH)
    const grows = w !== node.w || h !== node.h
    grid.update(el, { minW, minH, w, h })
    if (grows) persist()
  }

  // Objet neuf pour gridstack (il le modifie) : jamais l'état Svelte directement.
  function makeItem(el: HTMLElement): void {
    const widget = app.profile.widgets.find((w) => w.id === el.dataset.id)
    const manifest =
      widget && Object.hasOwn(widgets, widget.type) ? widgets[widget.type] : undefined
    if (!grid || !widget || !manifest || (el as GridItemHTMLElement).gridstackNode) return
    const { id, x, y, w, h } = widget
    const { minW, minH } = minCells(widget, manifest)
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
          alwaysShowResizeHandle: true
        },
        el
      ) ?? undefined
    // Les cartes se posent juste après (leurs propres attachements) : la suite attend le rendu.
    const ready = grid
    active = ready
    void tick().then(() => {
      if (!ready || grid !== ready) return
      untrack(() => el.querySelectorAll<HTMLElement>(':scope > .grid-stack-item').forEach(makeItem))
      // Colonnes selon la largeur (mode fenêtre étroit) : activées une fois les cartes posées en
      // 12 colonnes, pour que gridstack garde cette disposition et la rende quand la place
      // revient. Une grille née étroite (retour du mini-mode : la fenêtre a encore la taille de
      // la barre) rangeait sinon les cartes en 6 colonnes et perdait la vraie disposition.
      // updateOptions ne trie pas comme l'init : seuils du plus large au plus étroit, maximum.
      ready.updateOptions({
        columnOpts: {
          columnMax: COLUMNS,
          breakpoints: [
            { w: 860, c: 6 },
            { w: 560, c: 1 }
          ]
        }
      })
      // Sauvé seulement sur une action : glisser, redimensionner, ajouter (supprimer : remove) ; écouteurs
      // posés après le premier placement (ouvrir Photon n'écrit rien). Pas sur « change » :
      // gridstack le lance aussi quand il réarrange seul. dragstop / resizestop partent avant la
      // fin de sa mise à jour : lus juste après.
      ready.on('dragstop', () => {
        play('drop')
        queueMicrotask(persist)
      })
      ready.on('resizestop', () => {
        play('drop')
        queueMicrotask(persist)
      })
      ready.on('added', persist)
    })
    return () => {
      if (active === ready) active = undefined
      grid?.destroy(false)
      grid = undefined
    }
  }

  function setupItem(el: HTMLElement): () => void {
    untrack(() => makeItem(el))
    // Retrait sans événement : quand toute la grille se démonte (mini-mode, profil), gridstack
    // remonte les cartes restantes à chaque retrait ; sauver là écrivait un profil tassé (y = 0).
    return () => {
      if ((el as GridItemHTMLElement).gridstackNode) grid?.removeWidget(el, false, false)
    }
  }

  // Bouton « supprimer » : la carte part (setupItem), puis la disposition restante est sauvée.
  function remove(id: string): void {
    const index = app.profile.widgets.findIndex((w) => w.id === id)
    if (index < 0) return
    app.profile.widgets.splice(index, 1)
    play('remove')
    void tick().then(persist)
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

  // Réglage qui change la place demandée (design « Adapté » des lecteurs de musique) ou densité :
  // minimum recalculé. Largeur de fenêtre changée ensuite : pas suivie, le widget s'adapte seul.
  $effect(() => {
    for (const widget of items) {
      const manifest = widgets[widget.type]
      if (!manifest?.minSize) continue
      const min = minCells(widget, manifest)
      untrack(() => fitMin(widget.id, min))
    }
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

  /* Poignée de redimensionnement : un quart d'arc lumineux posé sur le coin de la carte
     (même taille que l'arrondi, sinon l'arc ne suit pas la courbe). */
  .grid-stack :global(.ui-resizable-se) {
    transform: none;
    box-sizing: border-box;
    width: max(18px, var(--radius));
    height: max(18px, var(--radius));
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
