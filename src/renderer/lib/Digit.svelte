<script lang="ts">
  // Un chiffre : une bande 0→9 qui glisse vers la valeur avec un ressort (transform seulement).
  import { untrack } from 'svelte'
  import { Spring } from 'svelte/motion'
  import { reducedMotion } from '../state.svelte'

  let { value }: { value: number } = $props()

  const position = new Spring(
    untrack(() => value),
    { stiffness: 0.12, damping: 0.62 }
  )

  $effect(() => {
    void position.set(value, { instant: reducedMotion() })
  })
</script>

<span class="digit">
  <span class="strip" style:transform="translateY({-position.current * 10}%)">
    {#each [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as n (n)}
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
