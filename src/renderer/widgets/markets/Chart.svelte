<script lang="ts">
  // Courbe d'une période : aire dégradée, veille en pointillés (1J), point du dernier cours.
  // Survol : ligne verticale et point sur le cours survolé (hover = son index, lu par le parent).
  // grid : trois lignes de niveau avec leur cours (design Marché).
  import type { MarketSeries } from '../../../shared/api'
  import { money, plot } from './chart'

  let {
    line,
    previous,
    base,
    grid = false,
    hover = $bindable(null)
  }: {
    line: MarketSeries
    previous: number | null
    base: number // au-dessus : vert ; la courbe suit le dernier cours, l'anneau du point le survol
    grid?: boolean
    hover?: number | null
  } = $props()

  const uid = $props.id()
  const p = $derived(plot(line.points, previous))
  const last = $derived(line.points.length - 1)
  const at = $derived(hover === null ? last : Math.min(hover, last))
  const up = $derived((line.points[last] ?? 0) >= base)
  const hoverUp = $derived((line.points[at] ?? 0) >= base)
  const levels = $derived([0.2, 0.5, 0.8].map((f) => ({ f, value: p.high - f * (p.high - p.low) })))

  function move(event: PointerEvent): void {
    const box = (event.currentTarget as HTMLElement).getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width))
    hover = Math.round(ratio * last)
  }
</script>

<div
  class="chart"
  class:down={!up}
  class:hover-down={!hoverUp}
  class:hovering={hover !== null}
  onpointermove={move}
  onpointerleave={() => (hover = null)}
  role="presentation"
>
  {#if grid}
    {#each levels as level (level.f)}
      <span class="level" style:top="{level.f * 100}%"></span>
      <span class="level-text" style:top="{level.f * 100}%">{money(level.value, '')}</span>
    {/each}
  {/if}
  <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <linearGradient id="fill-{uid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" class="stop-top" />
        <stop offset="1" class="stop-bottom" />
      </linearGradient>
    </defs>
    <path d={p.area} fill="url(#fill-{uid})" />
    <path class="line" d={p.line} />
  </svg>
  {#if previous !== null}<span class="previous" style:top="{p.y(previous)}%"></span>{/if}
  {#if hover !== null}<span class="cursor" style:left="{p.x(at)}%"></span>{/if}
  <span class="dot" style:left="{p.x(at)}%" style:top="{p.y(line.points[at] ?? 0)}%"></span>
</div>

<style>
  .chart {
    --trend: var(--rise);
    position: relative;
    flex: 1;
    min-height: 0;
    cursor: crosshair;
  }

  .chart.down {
    --trend: var(--danger-text);
  }

  .chart {
    --hover-trend: var(--rise);
  }

  .chart.hover-down {
    --hover-trend: var(--danger-text);
  }

  svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
  }

  .stop-top {
    stop-color: var(--trend);
    stop-opacity: 0.28;
  }

  .stop-bottom {
    stop-color: var(--trend);
    stop-opacity: 0;
  }

  .line {
    fill: none;
    stroke: var(--trend);
    stroke-width: 1.75;
    vector-effect: non-scaling-stroke;
    stroke-linejoin: round;
    stroke-linecap: round;
  }

  .previous,
  .level {
    position: absolute;
    left: 0;
    right: 0;
    pointer-events: none;
  }

  .previous {
    border-top: 1px dashed var(--white-30);
  }

  .level {
    border-top: 1px solid var(--white-6);
  }

  .level-text {
    position: absolute;
    left: 0;
    translate: 0 -13px;
    font-size: calc(10px * var(--font-scale));
    line-height: 12px;
    color: var(--text-faint);
    font-variant-numeric: tabular-nums;
    pointer-events: none;
  }

  .cursor {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 1px;
    background: var(--white-35);
    pointer-events: none;
  }

  .dot {
    position: absolute;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--trend);
    box-shadow: 0 0 10px var(--trend);
    transform: translate(-50%, -50%);
    pointer-events: none;
  }

  .hovering .dot {
    background: var(--text);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--hover-trend) 35%, transparent);
  }
</style>
