<script lang="ts">
  // Un chiffre : une bande 0→9 qui glisse vers la valeur avec un ressort (transform seulement).
  // La position est cumulée et prend le plus court chemin : 9 → 0 avance d'un cran au lieu de
  // redescendre toute la bande. Le « 0 » répété en bas rend le passage 9 → 0 continu.
  import { untrack } from 'svelte'
  import { Spring } from 'svelte/motion'
  import { reducedMotion } from '../state.svelte'

  let { value }: { value: number } = $props()

  let target = untrack(() => value)
  const position = new Spring(target, { stiffness: 0.12, damping: 0.62 })

  $effect(() => {
    target += ((((value - target) % 10) + 15) % 10) - 5 // écart le plus court, de -5 à +4
    void position.set(target, { instant: reducedMotion() })
  })

  const offset = $derived(((position.current % 10) + 10) % 10)
</script>

<span class="digit">
  <span class="strip" style:transform="translateY({-offset}em)">
    {#each [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0] as n, i (i)}
      <span>{n}</span>
    {/each}
  </span>
</span>

<style>
  .digit {
    display: inline-block;
    height: 1em;
    overflow: hidden;
    line-height: 1;
  }

  .strip {
    display: flex;
    flex-direction: column;
    will-change: transform;
  }

  .strip span {
    height: 1em;
  }
</style>
