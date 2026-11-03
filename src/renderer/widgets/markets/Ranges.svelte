<script lang="ts">
  // Choix de la période : 1J, 5J, 1M, 1A.
  import type { MarketRange } from '../../../shared/api'
  import { RANGES } from './chart'

  let { value, onpick }: { value: MarketRange; onpick(range: MarketRange): void } = $props()
</script>

<div class="ranges" role="group" aria-label="Période" data-no-drag>
  {#each RANGES as range (range)}
    <button
      type="button"
      class:on={range === value}
      aria-pressed={range === value}
      onclick={() => onpick(range)}>{range}</button
    >
  {/each}
</div>

<style>
  .ranges {
    flex: none;
    display: flex;
    padding: 2px;
    border: 1px solid var(--line);
    border-radius: var(--radius-pill);
    background: var(--white-5);
  }

  button {
    height: 22px;
    padding: 0 9px;
    border: 0;
    border-radius: var(--radius-pill);
    background: transparent;
    color: var(--text-muted);
    font: inherit;
    font-size: var(--text-11);
    font-weight: var(--weight-semibold);
    cursor: pointer;
    transition: transform var(--dur-spring) var(--ease-spring);
  }

  button:not(.on):hover {
    color: var(--text);
  }

  button.on {
    background: var(--accent);
    color: var(--on-accent);
  }

  button:active {
    transform: scale(0.96);
  }

  button:focus-visible {
    outline: var(--focus-ring);
    outline-offset: var(--focus-offset);
  }
</style>
