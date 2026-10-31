<script lang="ts">
  // Carte de verre autour d'un widget : survol lumineux, appui à ressort, isolation des pannes.
  import XIcon from 'phosphor-svelte/lib/XIcon'
  import type { WidgetInstance } from '../../shared/model'
  import { app, saveProfile } from '../state.svelte'
  import type { WidgetManifest, WidgetSettings } from '../widgets/types'
  import { mergeSettings } from './layout'

  let {
    widget,
    manifest,
    onremove
  }: { widget: WidgetInstance; manifest: WidgetManifest; onremove: () => void } = $props()

  const settings = $derived(mergeSettings(manifest.defaults, widget.settings))
  const Widget = $derived(manifest.component)

  function save(next: WidgetSettings): void {
    widget.settings = { ...next }
    saveProfile()
  }

  // Un widget qui plante n'affiche son erreur que dans sa case ; le reste de Photon continue.
  function logError(error: unknown): void {
    console.error(`[photon] le widget « ${widget.type} » a planté`, error)
  }
</script>

<article class="card" class:editing={app.editing} data-reveal aria-label={manifest.name}>
  <div class="content">
    <svelte:boundary onerror={logError}>
      <Widget {settings} editing={app.editing} {save} />
      {#snippet failed(error, reset)}
        <div class="failed" role="alert">
          <p title={String(error)}>Ce widget a rencontré un problème.</p>
          <button type="button" class="action" onclick={reset}>Réessayer</button>
        </div>
      {/snippet}
    </svelte:boundary>
  </div>
  {#if app.editing}
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
    background: var(--card-bg);
    border: 1px solid var(--line);
    transition: transform 450ms var(--ease-spring);
  }

  /* Bordure qui s'éclaire et halo d'accent : un calque dont seule l'opacité change. */
  .card::before {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: inherit;
    border: 1px solid color-mix(in srgb, var(--accent) 55%, transparent);
    box-shadow: 0 0 40px -12px var(--accent);
    opacity: 0;
    transition: opacity 200ms var(--ease-out);
    pointer-events: none;
  }

  .card:hover {
    transform: translateY(-2px);
  }

  .card:hover::before {
    opacity: 1;
  }

  /* Appui : 97 % puis retour en ressort (le ressort vient de la transition de base). */
  .card:active {
    transform: translateY(-1px) scale(0.97);
    transition-duration: 120ms;
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

  .remove {
    position: absolute;
    top: -8px;
    right: -8px;
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
    padding: 0;
    border: 1px solid var(--line);
    border-radius: 50%;
    background: #1b1d24;
    color: var(--text);
    cursor: pointer;
  }

  .remove:hover {
    background: #2a1d22;
    color: #ff9aa8;
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
    font-size: 13px;
  }

  .failed p {
    margin: 0;
  }
</style>
