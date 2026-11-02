<script lang="ts">
  // Carte de verre autour d'un widget : survol lumineux, appui à ressort, isolation des pannes.
  import XIcon from 'phosphor-svelte/lib/XIcon'
  import type { WidgetInstance } from '../../shared/model'
  import { app, saveProfile } from '../state.svelte'
  import type { WidgetManifest, WidgetSettings } from '../widgets/types'
  import { mergeSettings } from './layout'

  // preview : aperçu du catalogue, jamais en édition, rien d'enregistré.
  let {
    widget,
    manifest,
    onremove,
    preview = false
  }: {
    widget: WidgetInstance
    manifest: WidgetManifest
    onremove?: () => void
    preview?: boolean
  } = $props()

  const editing = $derived(app.editing && !preview)

  const settings = $derived(mergeSettings(manifest.defaults, widget.settings))
  const Widget = $derived(manifest.component)

  // Les clés inconnues de cette version (réglage d'une version plus récente ou plus ancienne)
  // sont gardées : changer de version de Photon ne fait perdre aucun réglage.
  function save(next: WidgetSettings): void {
    if (preview) return
    widget.settings = { ...widget.settings, ...next }
    saveProfile()
  }

  // Un widget qui plante n'affiche son erreur que dans sa case ; le reste de Photon continue.
  function logError(error: unknown): void {
    console.error(`[photon] le widget « ${widget.type} » a planté`, error)
  }

  // Point lumineux qui suit le curseur le long de la bordure (déplacé par transform seulement).
  let light = $state({ x: 0, y: 0 })

  function track(event: PointerEvent): void {
    const box = (event.currentTarget as HTMLElement).getBoundingClientRect()
    light = { x: event.clientX - box.left, y: event.clientY - box.top }
  }
</script>

<article class="card" class:editing data-reveal aria-label={manifest.name} onpointermove={track}>
  <span class="ring" aria-hidden="true">
    <span class="spot" style:transform="translate({light.x}px, {light.y}px)"></span>
  </span>
  <div class="content">
    <svelte:boundary onerror={logError}>
      <Widget {settings} {editing} {save} {preview} />
      {#snippet failed(error, reset)}
        <div class="failed" role="alert">
          <p title={String(error)}>Ce widget a rencontré un problème.</p>
          <button type="button" class="action" onclick={reset}>Réessayer</button>
        </div>
      {/snippet}
    </svelte:boundary>
  </div>
  {#if editing && onremove}
    <button class="remove" type="button" aria-label="Supprimer {manifest.name}" onclick={onremove}>
      <XIcon size={14} weight="bold" aria-hidden="true" />
    </button>
  {/if}
</article>

<style>
  .card {
    position: relative;
    box-sizing: border-box;
    height: 100%;
    border-radius: var(--radius);
    background: var(--glass-sheen);
    border: 1px solid var(--glass-edge);
    box-shadow: var(--shadow-card);
    transition: transform var(--dur-spring-card) var(--ease-spring);
  }

  /* Bordure qui s'éclaire et halo d'accent : un calque dont seule l'opacité change. */
  .card::before {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: inherit;
    border: 1px solid color-mix(in srgb, var(--accent) 55%, transparent);
    box-shadow: var(--glow-card);
    opacity: 0;
    transition: opacity var(--dur-hover) var(--ease-out);
    pointer-events: none;
  }

  .card:hover {
    transform: translateY(-2px);
  }

  .card:hover::before {
    opacity: 1;
  }

  /* Anneau de 1 px (masque) dans lequel glisse un point de lumière d'accent. */
  .ring {
    position: absolute;
    inset: -1px;
    padding: 1px;
    border-radius: inherit;
    overflow: hidden;
    mask:
      linear-gradient(#000 0 0) content-box,
      linear-gradient(#000 0 0);
    mask-composite: exclude;
    opacity: 0;
    transition: opacity var(--dur-hover) var(--ease-out);
    pointer-events: none;
  }

  .card:hover .ring {
    opacity: 1;
  }

  .spot {
    position: absolute;
    left: -110px;
    top: -110px;
    width: 220px;
    height: 220px;
    border-radius: 50%;
    background: radial-gradient(circle, var(--accent), transparent 70%);
    will-change: transform;
  }

  /* Appui : 97 % puis retour en ressort (le ressort vient de la transition de base).
     Pas pour les widgets où l'on tape et sélectionne du texte (data-no-press). */
  .card:active:not(:has([data-no-press])) {
    transform: translateY(-1px) scale(0.97);
    transition-duration: var(--dur-press-card);
    transition-timing-function: var(--ease-out);
  }

  .card.editing {
    cursor: grab;
    transform: none;
  }

  /* Les widgets dimensionnent leur contenu sur la carte (unités cqw / cqh). */
  .content {
    height: 100%;
    container-type: size;
    overflow: hidden;
    border-radius: inherit;
  }

  /* Réglages d'une petite case (mode édition) : ils défilent au lieu d'être coupés. */
  .editing .content {
    overflow-y: auto;
  }

  /* Bouton × centré sur l'arc du coin (à 0,29 × l'arrondi du bord), pas dans le vide. */
  .remove {
    position: absolute;
    top: calc(var(--radius) * 0.29 - 14px);
    right: calc(var(--radius) * 0.29 - 14px);
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
    padding: 0;
    border: 1px solid var(--line);
    border-radius: 50%;
    background: var(--surface-chip);
    color: var(--text);
    cursor: pointer;
  }

  .remove:hover {
    background: var(--surface-chip-danger);
    color: var(--danger-text);
  }

  .failed {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 16px;
    text-align: center;
    color: var(--text-muted);
    font-size: var(--text-13);
  }

  .failed p {
    margin: 0;
  }
</style>
