<script lang="ts">
  // Texte dont les chiffres défilent (compteur) au lieu de sauter : « 14:32 », « 23 », « 412 ».
  // Les autres caractères restent fixes. Les lecteurs d'écran lisent la valeur entière.
  import Digit from './Digit.svelte'

  let { value }: { value: string } = $props()

  const chars = $derived([...value])
</script>

<span class="rolling">
  <span class="sr">{value}</span>
  <span class="digits" aria-hidden="true">
    {#each chars as char, index (index)}
      {#if char >= '0' && char <= '9'}
        <Digit value={Number(char)} />
      {:else}
        <span>{char}</span>
      {/if}
    {/each}
  </span>
</span>

<style>
  .rolling {
    display: inline-block;
    font-variant-numeric: tabular-nums;
  }

  .digits {
    display: inline-flex;
  }

  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
</style>
