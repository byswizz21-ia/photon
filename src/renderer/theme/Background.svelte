<script lang="ts">
  // Calque de fond (plein écran) : fond d'écran Windows, image, dégradé ou scène « Lumineux »
  // (variante Urgot comprise),
  // flouté par le panneau. Si l'image ne charge pas, le calque disparaît : on voit le flou
  // acrylic de Windows et le voile.
  import { app } from '../state.svelte'
  import { backgroundUrl } from './apply.svelte'

  const bg = $derived(app.theme.background)
  const url = $derived(backgroundUrl(bg))
</script>

{#if bg.type === 'glow'}
  <div class="layer glow" class:urgot={bg.scene === 'urgot'}>
    <span class="orb blue"></span>
    <span class="orb orange"></span>
    <span class="orb violet"></span>
  </div>
{:else if bg.type === 'gradient'}
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

  /* Scène nette (le verre la floute) : rayures fines sur un dégradé bleu nuit → indigo et trois
     disques de couleur, placés pour rester visibles même dans une petite fenêtre centrée. */
  .glow {
    overflow: hidden;
    background:
      repeating-linear-gradient(120deg, var(--scene-stripe) 0 1px, transparent 1px 28px),
      linear-gradient(135deg, var(--scene-from), var(--scene-mid) 45%, var(--scene-to));
  }

  /* Scène « Urgot » : mêmes formes, couleurs de Zaun. */
  .urgot {
    --scene-from: var(--urgot-scene-from);
    --scene-mid: var(--urgot-scene-mid);
    --scene-to: var(--urgot-scene-to);
    --scene-stripe: var(--urgot-scene-stripe);
    --orb-blue: var(--urgot-orb-a);
    --orb-orange: var(--urgot-orb-b);
    --orb-violet: var(--urgot-orb-c);
  }

  .orb {
    position: absolute;
    aspect-ratio: 1;
    border-radius: var(--radius-pill);
    transform: translate(-50%, -50%);
  }

  .blue {
    left: 68%;
    top: 24%;
    width: 26%;
    background: var(--orb-blue);
  }

  .orange {
    left: 30%;
    top: 80%;
    width: 22%;
    background: var(--orb-orange);
  }

  .violet {
    left: 60%;
    top: 84%;
    width: 15%;
    background: var(--orb-violet);
  }
</style>
