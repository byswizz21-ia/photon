<script lang="ts">
  // Design « Jambes » (thème Urgot) : heure classique, et sous la date 6 jambes inclinées qui
  // s'allument une par une toutes les 10 secondes (la dernière allumée brille).
  import RollingNumber from '../../lib/RollingNumber.svelte'
  import { LEGS, litLeg } from './time'

  let { time, date, seconds }: { time: string; date: string; seconds: number } = $props()

  const lit = $derived(litLeg(seconds))
  const legs = Array.from({ length: LEGS }, (_, i) => i)
</script>

<div class="widget">
  <p class="time" data-intro="spin"><RollingNumber value={time} /></p>
  <div class="foot">
    <p class="date" data-intro="date">{date}</p>
    <div class="legs" title="Jambes : une s'allume toutes les 10 secondes" aria-hidden="true">
      {#each legs as i (i)}
        <span class="leg" class:on={i <= lit} class:last={i === lit}></span>
      {/each}
    </div>
  </div>
</div>

<style>
  .widget {
    --pad: clamp(14px, 6cqmin, 28px);
    box-sizing: border-box;
    height: 100%;
    padding: var(--pad);
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 12px;
  }

  .time {
    margin: 0;
    font-size: min(96px, 100cqh - 2 * var(--pad) - 52px, (100cqw - 2 * var(--pad)) / 2.75);
    font-weight: var(--weight-light);
    letter-spacing: var(--tracking-display);
    line-height: 1;
    white-space: nowrap;
  }

  .foot {
    min-width: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .date {
    margin: 0;
    min-width: 0;
    font-size: clamp(12px, 7cqw, 16px);
    line-height: 20px;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .legs {
    flex: none;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  /* Allumage instantané (pas d'animation de couleur), halo sur la dernière. */
  .leg {
    width: 14px;
    height: 6px;
    border-radius: 2px;
    background: var(--white-12);
    transform: skewX(-20deg);
  }

  .leg.on {
    background: var(--accent);
  }

  .leg.last {
    box-shadow: 0 0 8px var(--accent);
  }
</style>
