<script lang="ts">
  // Prochaines heures : une colonne par heure (heure, icône, température) et la courbe des
  // températures dessous, l'heure en cours marquée d'un point plein.
  import type { WeatherHour } from '../../../shared/api'
  import { describe } from './codes'
  import { curve } from './forecast'

  let { hours }: { hours: WeatherHour[] } = $props()

  let width = $state(0)
  const c = $derived(
    curve(
      hours.map((h) => h.temperature),
      width || 1,
      44
    )
  )
</script>

<div class="hours" style:--n={hours.length}>
  {#each hours as h, i (h.time)}
    {@const d = describe(h.code, h.day)}
    <div class="hour">
      <span class="l">{i === 0 ? 'Maint.' : `${new Date(h.time).getHours()} h`}</span>
      <d.icon size={20} weight="duotone" aria-label={d.label} />
      <span class="t">{Math.round(h.temperature)}°</span>
    </div>
  {/each}
</div>
<div class="curve" bind:clientWidth={width} aria-hidden="true">
  {#if width}
    <svg {width} height="44">
      <path class="area" d={c.area} />
      <path class="line" d={c.line} />
    </svg>
    {#each c.points as [x, y], i (i)}
      <span class="dot" class:first={i === 0} style:left="{x - 4}px" style:top="{y - 4}px"></span>
    {/each}
  {/if}
</div>

<style>
  .hours {
    display: grid;
    grid-template-columns: repeat(var(--n), minmax(0, 1fr));
  }

  .hour {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    color: var(--text-muted);
  }

  .l {
    font-size: var(--text-12);
    white-space: nowrap;
  }

  .t {
    font-size: var(--text-13);
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }

  .curve {
    position: relative;
    height: 44px;
    margin-top: 2px;
  }

  svg {
    position: absolute;
    inset: 0;
    overflow: visible;
  }

  .area {
    fill: color-mix(in srgb, var(--accent) 12%, transparent);
  }

  .line {
    fill: none;
    stroke: var(--accent);
    stroke-width: 2;
    stroke-linecap: round;
  }

  .dot {
    position: absolute;
    box-sizing: border-box;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--surface-ring);
    border: 2px solid var(--accent);
  }

  .dot.first {
    background: var(--accent);
    box-shadow: var(--glow-dot);
  }
</style>
