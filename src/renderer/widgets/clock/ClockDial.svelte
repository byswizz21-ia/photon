<script lang="ts">
  // Design « Cadran » (3×3) : 60 graduations en cercle, les secondes écoulées s'allument et
  // remplissent le tour ; heure, date, semaine et jour de l'année au centre.
  import RollingNumber from '../../lib/RollingNumber.svelte'
  import { dayOfYear, isoWeek } from './time'

  let { now, date }: { now: Date; date: string } = $props()

  const two = (n: number): string => String(n).padStart(2, '0')
  const TICKS = Array.from({ length: 60 }, (_, i) => i)
  const second = $derived(now.getSeconds())
</script>

<div class="widget">
  {#each TICKS as i (i)}
    <span
      class="tick"
      class:major={i % 5 === 0}
      class:lit={i < second}
      class:cur={i === second}
      style:--turn="{i * 6}deg"
      aria-hidden="true"
    ></span>
  {/each}
  <div class="center">
    <span class="time" data-intro="spin">
      <RollingNumber value="{two(now.getHours())}:{two(now.getMinutes())}" />
    </span>
    <div class="sub">
      <span class="date" data-intro="date">{date}</span>
      <span class="label">S{isoWeek(now)} · J{dayOfYear(now)}</span>
    </div>
  </div>
</div>

<style>
  /* Rayon des graduations : 119 px sur la carte de la maquette (280 px), proportionnel ensuite. */
  .widget {
    --r: 42.5cqmin;
    position: relative;
    height: 100%;
  }

  .tick {
    --len: 6px;
    position: absolute;
    left: 50%;
    top: 50%;
    width: 2px;
    height: var(--len);
    border-radius: 1px;
    background: var(--white-12);
    transform: translate(-50%, -50%) rotate(var(--turn)) translateY(calc(var(--len) / 2 - var(--r)));
  }

  .tick.major {
    --len: 10px;
    background: var(--white-35);
  }

  .tick.lit {
    background: color-mix(in srgb, var(--accent) 70%, transparent);
  }

  .tick.cur {
    --len: 16px;
    background: var(--accent);
    box-shadow: var(--glow-dot);
  }

  .center {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
  }

  .time {
    font-size: max(58px, 20.7cqmin);
    font-weight: var(--weight-light);
    letter-spacing: var(--tracking-display);
    line-height: 1;
  }

  .sub {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .date {
    font-size: var(--text-13);
    color: var(--text-muted);
  }

  .label {
    font-size: var(--text-11);
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
    color: var(--text-faint);
  }
</style>
