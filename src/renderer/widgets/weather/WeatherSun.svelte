<script lang="ts">
  // Design « Course du soleil » : l'arc du lever au coucher, le soleil à sa place, la carte
  // teintée autour de lui (violet la nuit). 3×2 : température et arc ; 6×3 : aussi 4 jours de
  // prévisions, ressenti, humidité et vent.
  import type { WeatherFeed, WeatherNow } from '../../../shared/api'
  import { describe } from './codes'
  import { sunArc } from './forecast'

  let { feed, current, now }: { feed: WeatherFeed; current: WeatherNow; now: number } = $props()

  let width = $state(0)
  let height = $state(0)
  const wide = $derived(width >= 540 && height >= 260)
  const pad = $derived(wide ? 24 : 20)
  const arcW = $derived(wide ? 300 : Math.max(120, width - 2 * pad))
  const arcH = $derived(wide ? 72 : 48)

  const today = $derived(feed.days[0])
  const rise = $derived(today?.sunrise ?? null)
  const set = $derived(today?.sunset ?? null)
  const sun = $derived(rise !== null && set !== null ? sunArc(arcW, arcH, rise, set, now) : null)
  const sky = $derived(describe(current.code, current.day))
  const deg = (n: number | null): string => (n === null ? '–' : `${Math.round(n)}°`)
  const two = (n: number): string => String(n).padStart(2, '0')
  const hm = (at: number | null): string => {
    if (at === null) return '–'
    const d = new Date(at)
    return `${two(d.getHours())}:${two(d.getMinutes())}`
  }
  const note = $derived(
    sun?.day ? `Coucher dans ${Math.floor(sun.toSet / 60)} h ${two(sun.toSet % 60)}` : 'Nuit'
  )
  const minmax = $derived(today ? `${deg(today.min)} / ${deg(today.max)}` : '')
  const weekday = (date: string): string =>
    new Date(`${date}T12:00`)
      .toLocaleDateString('fr-FR', { weekday: 'short' })
      .replace('.', '')
      .replace(/^./, (c) => c.toUpperCase())
</script>

{#snippet arc(r: number)}
  {#if sun}
    <svg width={arcW} height={arcH} aria-hidden="true">
      <line class="ground" x1="0" y1={arcH - 4} x2={arcW} y2={arcH - 4} />
      <path class="full" d={sun.full} />
      <path class="done" d={sun.done} />
      <circle class="sun" class:night={!sun.day} cx={sun.x} cy={sun.y} {r} />
    </svg>
  {/if}
{/snippet}

<div
  class="widget"
  class:wide
  class:night={!sun?.day}
  style:--sun-x="{pad + (sun?.x ?? width / 2)}px"
  bind:clientWidth={width}
  bind:clientHeight={height}
>
  <span class="wash" aria-hidden="true"></span>
  {#if wide}
    <div class="main">
      <div class="top">
        <div class="col">
          <span class="label">{feed.place}</span>
          <span class="temp t68">{deg(current.temperature)}</span>
          <span class="sky">{sky.label}</span>
        </div>
        <sky.icon size={40} weight="duotone" color="var(--accent)" class="icon" />
      </div>
      <div>
        {@render arc(6)}
        <div class="times">
          <span>Lever {hm(rise)}</span><span class="note">{note}</span><span>Coucher {hm(set)}</span
          >
        </div>
      </div>
    </div>
    <div class="side">
      <span class="label">Prévisions</span>
      {#each feed.days.slice(1, 5) as d (d.date)}
        {@const s = describe(d.code)}
        <div class="day">
          <span class="muted">{weekday(d.date)}</span>
          <s.icon size={18} weight="duotone" color="var(--accent)" />
          <span class="cond">{s.label}</span>
          <span class="mm">{deg(d.max)} <span class="faint">{deg(d.min)}</span></span>
        </div>
      {/each}
      <div class="foot">
        Ressenti {deg(current.feels)} · Humidité {current.humidity === null
          ? '–'
          : `${Math.round(current.humidity)} %`} · Vent {current.wind === null
          ? '–'
          : `${Math.round(current.wind)} km/h`}
      </div>
    </div>
  {:else}
    <div class="top">
      <div class="col six">
        <span class="temp t48">{deg(current.temperature)}</span>
        <span class="muted">{sky.label}{minmax ? ` · ${minmax}` : ''}</span>
      </div>
      <span class="label">{feed.place}</span>
    </div>
    <div class="arc">
      {@render arc(5)}
      <div class="times">
        <span>{hm(rise)}</span><span class="note">{note}</span><span>{hm(set)}</span>
      </div>
    </div>
  {/if}
</div>

<style>
  .widget {
    --tint: var(--accent-orange);
    --tint-mix: 24%;
    position: relative;
    box-sizing: border-box;
    height: 100%;
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .widget.night {
    --tint: var(--glow-secondary);
    --tint-mix: 22%;
  }

  .widget.wide {
    padding: 20px 24px;
    display: grid;
    grid-template-columns: 300px minmax(0, 1fr);
    gap: 28px;
  }

  /* Teinte autour du soleil. */
  .wash {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    background: radial-gradient(
      circle at var(--sun-x) 80%,
      color-mix(in srgb, var(--tint) var(--tint-mix), transparent),
      transparent 62%
    );
  }

  .top,
  .main,
  .side,
  .arc {
    position: relative;
  }

  .top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .main {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .main :global(.icon) {
    margin-top: 20px;
  }

  .col {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .col.six {
    gap: 6px;
  }

  .temp {
    font-weight: var(--weight-light);
    letter-spacing: var(--tracking-display);
    line-height: 0.9;
    font-variant-numeric: tabular-nums;
  }

  .t48 {
    font-size: 48px;
  }

  .t68 {
    font-size: 68px;
  }

  .sky {
    font-size: var(--text-14);
  }

  .muted {
    font-size: var(--text-13);
    color: var(--text-muted);
  }

  .faint {
    color: var(--text-faint);
  }

  .label {
    font-size: var(--text-12);
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
    color: var(--text-faint);
  }

  svg {
    display: block;
    overflow: visible;
  }

  .ground {
    stroke: var(--white-8);
    stroke-width: 1;
  }

  .full {
    fill: none;
    stroke: var(--white-20);
    stroke-width: 1.5;
    stroke-dasharray: 2 5;
    stroke-linecap: round;
  }

  .done {
    fill: none;
    stroke: var(--accent-orange);
    stroke-width: 2;
    stroke-linecap: round;
    opacity: 0.85;
  }

  .sun {
    fill: var(--accent-orange);
    filter: drop-shadow(0 0 6px var(--accent-orange));
  }

  .sun.night {
    fill: var(--text-faint);
    filter: none;
  }

  .times {
    display: flex;
    justify-content: space-between;
    margin-top: 6px;
    font-size: var(--text-11);
    color: var(--text-faint);
    font-variant-numeric: tabular-nums;
  }

  .note {
    color: var(--text-muted);
  }

  .side {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .side .label {
    margin-bottom: 6px;
  }

  .day {
    display: grid;
    grid-template-columns: 34px 24px minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px;
    height: 30px;
    font-size: var(--text-13);
  }

  .cond {
    font-size: var(--text-12);
    color: var(--text-faint);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .mm {
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .foot {
    margin-top: auto;
    padding-top: 10px;
    border-top: 1px solid var(--line);
    font-size: var(--text-12);
    color: var(--text-muted);
  }
</style>
