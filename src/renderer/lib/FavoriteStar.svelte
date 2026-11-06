<script lang="ts">
  // Étoile d'un widget dans le menu « Ajouter » et le catalogue : le met en favori ou l'en retire.
  // Discrète tant que la ligne n'est pas survolée, toujours visible une fois allumée.
  import StarIcon from 'phosphor-svelte/lib/StarIcon'
  import { app, toggleFavorite } from '../state.svelte'

  let { type, name }: { type: string; name: string } = $props()

  const on = $derived(app.settings.favorites.includes(type))
</script>

<button
  type="button"
  class="star"
  class:on
  aria-pressed={on}
  aria-label={on ? `Retirer ${name} des favoris` : `Mettre ${name} en favori`}
  title={on ? 'Retirer des favoris' : 'Mettre en favori'}
  onclick={(event) => {
    event.stopPropagation()
    toggleFavorite(type)
  }}
  ondblclick={(event) => event.stopPropagation()}
>
  <StarIcon size={16} weight={on ? 'fill' : 'regular'} aria-hidden="true" />
</button>

<style>
  .star {
    position: absolute;
    top: 6px;
    right: 6px;
    width: 28px;
    height: 28px;
    min-height: 0;
    display: grid;
    place-items: center;
    padding: 0;
    border: 0;
    border-radius: var(--radius-pill);
    background: transparent;
    color: var(--text-faint);
    cursor: pointer;
    opacity: 0;
    transition:
      opacity var(--dur-fast) var(--ease-out),
      transform var(--dur-spring) var(--ease-spring);
  }

  :global(li:hover) > .star,
  .star:focus-visible,
  .star.on {
    opacity: 1;
  }

  .star:hover {
    color: var(--text);
    background: var(--surface-hover);
  }

  .star.on {
    color: var(--accent);
  }

  .star:active {
    transform: scale(0.85);
    transition-duration: var(--dur-press);
  }
</style>
