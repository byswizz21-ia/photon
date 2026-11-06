<script lang="ts">
  // Design « Marché » : la liste suivie à gauche (courbe du jour, cours, variation), l'actif choisi
  // à droite avec un graphique détaillé de 1 jour à 1 an, ses niveaux, ses dates et ses extrêmes.
  import type { MarketFeed, MarketQuote, MarketRange } from '../../../shared/api'
  import Chart from './Chart.svelte'
  import { baseOf, currencyOf, hm, money, percent, seriesOf, status, timeText } from './chart'
  import Price from './Price.svelte'
  import Ranges from './Ranges.svelte'

  let { feed, now }: { feed: MarketFeed; now: number } = $props()

  // Actif choisi retenu par symbole : la liste grandit quand un cours arrive en retard.
  let symbol = $state('')
  let range = $state<MarketRange>('1J')
  let hover = $state<number | null>(null)

  const quotes = $derived(feed.quotes)
  const current = $derived(
    Math.max(
      0,
      quotes.findIndex((q) => q.symbol === symbol)
    )
  )
  const quote = $derived(quotes[current] as MarketQuote)
  const line = $derived(seriesOf(quote, range))
  const base = $derived(line ? baseOf(quote, range, line) : quote.previous)
  const market = $derived(status(quote, now))
  const ticks = $derived(
    line
      ? [0, 1 / 3, 2 / 3, 1].map((f) => line.times[Math.round(f * (line.times.length - 1))] ?? 0)
      : []
  )
  const stats = $derived(
    line
      ? [
          { label: 'Haut', value: Math.max(...line.points) },
          { label: 'Bas', value: Math.min(...line.points) },
          range === '1J'
            ? { label: 'Veille', value: quote.previous }
            : { label: 'Début', value: line.points[0] ?? 0 }
        ]
      : []
  )

  const change = (q: MarketQuote): number => (100 * (q.price - q.previous)) / q.previous

  // Courbe de la liste : 100 × 30, échelle propre à chaque actif.
  function spark(points: number[]): string {
    const min = Math.min(...points)
    const span = Math.max(...points) - min || 1
    return points
      .map(
        (p, i) =>
          `${((100 * i) / (points.length - 1)).toFixed(1)},${(28 - (26 * (p - min)) / span).toFixed(1)}`
      )
      .join(' ')
  }
</script>

<div class="board">
  <div class="side">
    <div class="head">
      <span class="w-label">Cours</span>
      {#if feed.updatedAt}<span class="updated">Mis à jour à {hm(feed.updatedAt)}</span>{/if}
    </div>
    <ul>
      {#each quotes as q, i (q.symbol)}
        <li>
          <button
            type="button"
            class="row"
            class:on={i === current}
            class:down={change(q) < 0}
            title={q.symbol}
            onclick={() => ((symbol = q.symbol), (hover = null))}
          >
            <span class="who"><span>{q.name}</span><small>{q.symbol}</small></span>
            {#if q.points.length > 1}
              <svg viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
                <polyline points={spark(q.points)} />
              </svg>
            {:else}<span></span>{/if}
            <span class="quote"
              ><span>{money(q.price, currencyOf(q))}</span><small>{percent(change(q))}</small></span
            >
          </button>
        </li>
      {/each}
    </ul>
    {#if feed.missing.length}<p class="updated">Introuvable : {feed.missing.join(', ')}</p>{/if}
  </div>

  <div class="detail">
    <div class="title">
      <div class="who-big">
        <p class="name">{quote.name}<span>{quote.symbol}</span></p>
        <span class="state" title={market.long}
          ><span class="dot" class:open={market.open}></span><span class="mid">{market.mid}</span
          ></span
        >
      </div>
      <Ranges value={range} onpick={(r) => ((range = r), (hover = null))} />
    </div>
    <Price {quote} {line} {range} {base} {hover} />
    {#if line}
      <Chart {line} {base} previous={range === '1J' ? quote.previous : null} grid bind:hover />
      <div class="ticks">
        {#each ticks as t, i (i)}<span>{timeText(t, range, true)}</span>{/each}
      </div>
      <dl class="stats">
        {#each stats as stat (stat.label)}
          <div>
            <dt>{stat.label}</dt>
            <dd>{money(stat.value, '')}</dd>
          </div>
        {/each}
      </dl>
    {:else}
      <p class="w-message">
        {range === '1J' ? 'Pas encore de cours aujourd’hui.' : 'Lecture de l’historique…'}
      </p>
    {/if}
  </div>
</div>

<style>
  .board {
    box-sizing: border-box;
    height: 100%;
    padding: 20px;
    display: grid;
    grid-template-columns: 212px minmax(0, 1fr);
    gap: 24px;
  }

  .side,
  .detail {
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .side {
    gap: 6px;
  }

  .head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  .updated {
    font-size: var(--text-11);
    color: var(--text-faint);
    font-variant-numeric: tabular-nums;
  }

  ul {
    flex: 1;
    min-height: 0;
    margin: 0;
    padding: 0;
    list-style: none;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .row {
    --trend: var(--rise);
    width: 100%;
    height: 34px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 40px 64px;
    align-items: center;
    gap: 8px;
    padding: 0 8px;
    box-sizing: border-box;
    border: 1px solid transparent;
    border-radius: var(--radius-row);
    background: transparent;
    color: var(--text);
    font: inherit;
    cursor: pointer;
  }

  .row.down {
    --trend: var(--danger-text);
  }

  .row:hover {
    background: var(--white-6);
  }

  .row.on {
    border-color: var(--border-accent-soft);
    background: var(--surface-accent-soft);
  }

  .row:focus-visible {
    outline: var(--focus-ring);
    outline-offset: var(--focus-offset);
  }

  .who,
  .quote {
    display: flex;
    flex-direction: column;
    min-width: 0;
    white-space: nowrap;
  }

  .who {
    text-align: left;
  }

  .who span,
  .who small {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .who span {
    font-size: var(--text-13);
    line-height: 16px;
  }

  .who small {
    font-size: var(--text-11);
    line-height: 13px;
    color: var(--text-faint);
  }

  .quote {
    align-items: flex-end;
    font-variant-numeric: tabular-nums;
  }

  .quote span {
    font-size: var(--text-12);
    line-height: 16px;
  }

  .quote small {
    font-size: var(--text-11);
    line-height: 13px;
    color: var(--trend);
  }

  svg {
    width: 100%;
    height: 20px;
  }

  polyline {
    fill: none;
    stroke: var(--trend);
    stroke-width: 1.5;
    vector-effect: non-scaling-stroke;
    stroke-linejoin: round;
  }

  .title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
  }

  .who-big {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
    overflow: hidden;
  }

  .name {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin: 0;
    font-size: var(--text-15);
    font-weight: var(--weight-medium);
    white-space: nowrap;
  }

  .name span {
    font-size: var(--text-12);
    font-weight: var(--weight-regular);
    color: var(--text-faint);
  }

  .state {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    font-size: var(--text-11);
    color: var(--text-faint);
    white-space: nowrap;
  }

  .mid {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dot {
    flex: none;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--text-faint);
  }

  .dot.open {
    background: var(--rise);
    box-shadow: 0 0 8px var(--rise);
  }

  .detail {
    --price-size: calc(36px * var(--font-scale));
  }

  .detail :global(.chart) {
    margin-top: 14px;
  }

  .ticks {
    display: flex;
    justify-content: space-between;
    margin-top: 6px;
    font-size: calc(10px * var(--font-scale));
    line-height: 12px;
    color: var(--text-faint);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    margin: 10px 0 0;
    padding-top: 10px;
    border-top: 1px solid var(--line);
  }

  .stats div {
    display: flex;
    align-items: baseline;
    gap: 5px;
    min-width: 0;
    white-space: nowrap;
  }

  dt {
    font-size: var(--text-11);
    color: var(--text-faint);
  }

  dd {
    margin: 0;
    font-size: var(--text-12);
    font-variant-numeric: tabular-nums;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .w-message {
    flex: 1;
    display: grid;
    place-items: center;
  }
</style>
