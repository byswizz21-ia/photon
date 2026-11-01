<script lang="ts">
  // Calque de fond (plein écran) : fond d'écran Windows, image ou dégradé, flouté. Si l'image
  // ne charge pas, le calque disparaît : on voit le flou acrylic de Windows et le voile.
  import { app } from '../state.svelte'
  import { backgroundUrl } from './apply.svelte'

  const bg = $derived(app.theme.background)
  const url = $derived(backgroundUrl(bg))
</script>

{#if bg.type === 'gradient'}
  <div class="layer" style:background="linear-gradient(135deg, {bg.from}, {bg.to})"></div>
{:else if url}
  <!-- Recréée à chaque nouvelle adresse : une erreur précédente ne masque pas la suivante. -->
  {#key url}
    <img
      class="layer"
      src={url}
      alt=""
      crossorigin="anonymous"
      onerror={(event) => ((event.currentTarget as HTMLImageElement).hidden = true)}
    />
  {/key}
{/if}

<style>
  /* Net : le flou est fait par le panneau de verre posé dessus (backdrop-filter). */
  .layer {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
</style>
