<script lang="ts">
  // Design « Détails progressifs » : plus la carte grandit, plus elle en montre. 3×2 : température,
  // ciel, ressenti, min / max ; 6×3 : prochaines heures et 4 tuiles ; 6×4 : 8 heures, tuiles
  // détaillées et 5 jours.
  import DropIcon from 'phosphor-svelte/lib/DropIcon'
  import SunHorizonIcon from 'phosphor-svelte/lib/SunHorizonIcon'
  import SunIcon from 'phosphor-svelte/lib/SunIcon'
  import UmbrellaIcon from 'phosphor-svelte/lib/UmbrellaIcon'
  import WindIcon from 'phosphor-svelte/lib/WindIcon'
  import type { WeatherFeed, WeatherNow } from '../../../shared/api'
  import { describe } from './codes'
  import Curve from './Curve.svelte'
  import { rainFrom, upcoming, uvLabel, windName } from './forecast'

  let { feed, current, now }: { feed: WeatherFeed; current: WeatherNow; now: number } = $props()

  let width = $state(0)
  let height = $state(0)
  // Seuils un peu sous la taille des maquettes (580×280, 580×380) : cases un peu plus petites.
  const size = $derived(width >= 540 ? (height >= 360 ? 'l' : height >= 260 ? 'm' : 's') : 's')

  const deg = (n: number | null): string => (n === null ? '–' : `${Math.round(n)}°`)
  const two = (n: number): string => String(n).padStart(2, '0')
  const hm = (at: number | null): string => {
    if (at === null) return '–'
    const d = new Date(at)
    return `${two(d.getHours())}:${two(d.getMinutes())}`
  }
  const sky = $derived(describe(current.code, current.day))
  const today = $derived(feed.days[0])
  // Point de la température actuelle entre le min et le max du jour (0 à 100 %).
  const spot = (lo: number, hi: number): number =>
    hi > lo ? Math.min(100, Math.max(0, ((current.temperature - lo) / (hi - lo)) * 100)) : 50
  const rainAt = $derived(rainFrom(feed.hours, now))
  const wind = $derived(current.wind === null ? '–' : `${Math.round(current.wind)} km/h`)
  const tiles = $derived([
    {
      icon: WindIcon,
      label: 'Vent',
      value: wind,
      short: current.windFrom === null ? 'Vent' : `Vent ${windName(current.windFrom, true)}`,
      sub: [
        current.windFrom === null ? '' : windName(current.windFrom),
        current.gusts === null ? '' : `rafales ${Math.round(current.gusts)}`
      ]
        .filter(Boolean)
        .join(' · ')
    },
    {
      icon: DropIcon,
      label: 'Humidité',
      value: current.humidity === null ? '–' : `${Math.round(current.humidity)} %`,
      short: 'Humidité',
      sub: current.dewPoint === null ? '' : `Point de rosée ${deg(current.dewPoint)}`
    },
    {
      icon: UmbrellaIcon,
      label: 'Pluie',
      value: today?.rain == null ? '–' : `${Math.round(today.rain)} %`,
      short: 'Pluie',
      sub: rainAt === null ? 'Pas d’averse prévue' : `Averses dès ${new Date(rainAt).getHours()} h`
    },
    size === 'l'
      ? {
          icon: SunHorizonIcon,
          label: 'Soleil',
          value: hm(today?.sunrise ?? null),
          short: 'Soleil',
          sub: `Coucher ${hm(today?.sunset ?? null)}${today?.uv == null ? '' : ` · UV ${Math.round(today.uv)}`}`
        }
      : {
          icon: SunIcon,
          label: 'UV',
          value: today?.uv == null ? '–' : String(Math.round(today.uv)),
          short: today?.uv == null ? 'UV' : `UV ${uvLabel(today.uv)}`,
          sub: ''
        }
  ])
  const days = $derived(feed.days.slice(0, 5))
  const lo = $derived(Math.min(...days.map((d) => d.min)))
  const hi = $derived(Math.max(...days.map((d) => d.max)))
  const weekday = (date: string, i: number): string =>
    i === 0
      ? 'Auj.'
      : new Date(`${date}T12:00`)
          .toLocaleDateString('fr-FR', { weekday: 'short' })
          .replace('.', '')
          .replace(/^./, (c) => c.toUpperCase())
</script>

{#snippet big(px: number)}
  <div class="big">
    <span class="temp" style:font-size="{px}px">{deg(current.temperature)}</span>
    <sky.icon size={px === 60 ? 48 : 44} weight="duotone" class="glow" aria-label={sky.label} />
  </div>
{/snippet}

<div class="widget s-{size}" bind:clientWidth={width} bind:clientHeight={height}>
  {#if size === 's'}
    <div class="row top">{@render big(60)}</div>
    <div class="col">
      <span class="sky">{sky.label}</span>
      <span class="muted">Ressenti {deg(current.feels)}</span>
    </div>
    <div class="range">
      <span class="city">{feed.place}</span>
      {#if today}
        <span class="faint">{deg(today.min)}</span>
        <span class="gauge"
          ><span class="now" style:left="{spot(today.min, today.max)}%"></span></span
        >
        <span>{deg(today.max)}</span>
      {/if}
    </div>
  {:else}
    <div class="head" class:fixed={size === 'l'}>
      <div class="left">
        <span class="label">{feed.place}</span>
        {@render big(72)}
        <div class="col">
          <span class="sky">{sky.label}</span>
          <span class="muted">
            Ressenti {deg(current.feels)}{#if size === 'm' && today}
              · {deg(today.min)} / {deg(today.max)}{/if}
          </span>
        </div>
      </div>
      <div class="next">
        <span class="label">Prochaines heures</span>
        <Curve hours={upcoming(feed.hours, now, size === 'l' ? 8 : 6)} />
      </div>
    </div>
    {#if size === 'm'}
      <div class="tiles">
        {#each tiles as t (t.label)}
          <div class="tile">
            <t.icon size={20} weight="duotone" color="var(--accent)" />
            <div class="col tight">
              <span class="v">{t.value}</span>
              <span class="tl">{t.short}</span>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="bottom">
        <div class="grid4">
          {#each tiles as t (t.label)}
            <div class="tile big-tile">
              <div class="tl icon-l">
                <t.icon size={16} weight="duotone" color="var(--accent)" />{t.label}
              </div>
              <span class="v18">{t.value}</span>
              <span class="tsub">{t.sub}</span>
            </div>
          {/each}
        </div>
        <div class="days">
          <span class="label">5 jours</span>
          {#each days as d, i (d.date)}
            {@const s = describe(d.code)}
            <div class="day">
              <span class="muted">{weekday(d.date, i)}</span>
              <s.icon size={18} weight="duotone" color="var(--text-muted)" aria-label={s.label} />
              <span class="faint right">{deg(d.min)}</span>
              <span class="track">
                <span
                  class="seg"
                  style:left="{hi > lo ? ((d.min - lo) / (hi - lo)) * 100 : 0}%"
                  style:width="{hi > lo ? ((d.max - d.min) / (hi - lo)) * 100 : 100}%"
                ></span>
                {#if i === 0}<span class="now" style:left="{spot(lo, hi)}%"></span>{/if}
              </span>
              <span>{deg(d.max)}</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .widget {
    box-sizing: border-box;
    height: 100%;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .s-s {
    padding: 18px 20px;
    justify-content: space-between;
    gap: 0;
  }

  .s-l {
    gap: 18px;
  }

  .row,
  .big {
    display: flex;
    align-items: center;
  }

  .top {
    justify-content: space-between;
    align-items: flex-start;
  }

  .s-s .big {
    flex: 1;
    justify-content: space-between;
    align-items: flex-start;
  }

  .big {
    gap: 14px;
  }

  .temp {
    font-weight: var(--weight-light);
    letter-spacing: var(--tracking-display);
    line-height: 0.9;
    font-variant-numeric: tabular-nums;
  }

  .big :global(.glow) {
    color: var(--accent);
    filter: drop-shadow(0 0 14px color-mix(in srgb, var(--accent) 55%, transparent));
  }

  .col {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .col.tight {
    gap: 1px;
    min-width: 0;
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

  .range {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: var(--text-12);
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }

  .city {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .gauge {
    position: relative;
    width: 64px;
    height: 4px;
    border-radius: 2px;
    background: linear-gradient(
      90deg,
      color-mix(in srgb, var(--accent) 30%, transparent),
      var(--accent)
    );
  }

  .now {
    position: absolute;
    top: 50%;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--text);
    box-shadow: 0 0 0 2px var(--surface-ring);
    transform: translate(-50%, -50%);
  }

  .head {
    flex: 1;
    min-height: 0;
    display: flex;
    gap: 24px;
  }

  .head.fixed {
    flex: none;
    height: 166px;
  }

  .left {
    width: 190px;
    flex: none;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .next {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .tiles {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
  }

  .tile {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: var(--radius-row);
    background: var(--white-5);
    border: 1px solid var(--line);
    min-width: 0;
  }

  .v {
    font-size: var(--text-14);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .tl {
    font-size: var(--text-11);
    color: var(--text-faint);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .bottom {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 24px;
  }

  .grid4 {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    grid-template-rows: 1fr 1fr;
    gap: 8px;
    min-width: 0;
  }

  .big-tile {
    flex-direction: column;
    align-items: stretch;
    justify-content: space-between;
    gap: 0;
    padding: 12px;
  }

  .icon-l {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .v18 {
    font-size: var(--text-18);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .tsub {
    font-size: var(--text-11);
    line-height: 1.25;
    color: var(--text-muted);
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
  }

  .days {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .days .label {
    margin-bottom: 4px;
  }

  .day {
    display: grid;
    grid-template-columns: 38px 22px 26px minmax(0, 1fr) 26px;
    align-items: center;
    gap: 8px;
    height: 26px;
    font-size: var(--text-13);
    font-variant-numeric: tabular-nums;
  }

  .right {
    text-align: right;
  }

  .track {
    position: relative;
    height: 4px;
    border-radius: 2px;
    background: var(--white-8);
  }

  .seg {
    position: absolute;
    top: 0;
    bottom: 0;
    border-radius: 2px;
    background: linear-gradient(
      90deg,
      color-mix(in srgb, var(--accent) 40%, transparent),
      var(--accent)
    );
  }
</style>
