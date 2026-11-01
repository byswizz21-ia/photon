<script lang="ts">
  // Une ligne par symbole : nom, courbe du jour, prix, variation depuis la veille.
  // Mode édition : la liste des symboles (validée à Entrée ou en quittant le champ).
  import type { MarketFeed } from '../../../shared/api'
  import { pollWhileVisible } from '../../lib/poll.svelte'
  import type { WidgetProps } from '../types'
  import type { MarketsSettings } from './manifest'

  let { settings, editing, save }: WidgetProps<MarketsSettings> = $props()

  let feed = $state.raw<MarketFeed | null>(null)

  // Cache de Photon seulement : relu souvent, ne coûte rien.
  pollWhileVisible(async () => {
    feed = await window.photon.markets(settings.symbols)
  }, 5_000)

  const money = (value: number, currency: string): string =>
    new Intl.NumberFormat('fr-FR', {
      ...(currency ? { style: 'currency', currency } : {}),
      maximumFractionDigits: value >= 1000 ? 0 : value >= 1 ? 2 : 4
    }).format(value)

  const change = (price: number, previous: number): number => (100 * (price - previous)) / previous

  // Courbe SVG 100 × 30, échelle propre à chaque symbole.
  function line(points: number[]): string {
    const min = Math.min(...points)
    const span = Math.max(...points) - min || 1
    return points
      .map((p, i) => `${(100 * i) / (points.length - 1)},${28 - (26 * (p - min)) / span}`)
      .join(' ')
  }
</script>

<div class="widget">
  <span class="label">Cours</span>
  {#if editing || !settings.symbols.trim()}
    <label class="field">
      Symboles Yahoo Finance
      <input
        value={settings.symbols}
        placeholder="BTC-EUR, AAPL, ^FCHI"
        maxlength="200"
        onchange={(event) => save({ ...settings, symbols: event.currentTarget.value.trim() })}
      />
      <span class="hint">Crypto : BTC-EUR · action : AAPL, MC.PA · indice : ^FCHI</span>
    </label>
  {:else if !feed?.quotes.length && !feed?.missing.length}
    <p class="empty">Lecture des cours…</p>
  {:else}
    <ul>
      {#each feed.quotes as quote (quote.symbol)}
        {@const pct = change(quote.price, quote.previous)}
        <li class:down={pct < 0}>
          <span class="name" title={quote.symbol}>{quote.name}</span>
          {#if quote.points.length > 1}
            <svg viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
              <polyline points={line(quote.points)} />
            </svg>
          {/if}
          <span class="price">{money(quote.price, quote.currency)}</span>
          <span class="pct">{pct >= 0 ? '+' : ''}{pct.toFixed(2).replace('.', ',')} %</span>
        </li>
      {/each}
    </ul>
    {#if feed.missing.length}
      <p class="empty">Introuvable : {feed.missing.join(', ')}</p>
    {/if}
  {/if}
</div>

<style>
  .widget {
    box-sizing: border-box;
    height: 100%;
    padding: clamp(12px, 9cqmin, 20px);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .label {
    font-size: var(--text-12);
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
    color: var(--text-faint);
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
    gap: 4px;
  }

  li {
    --trend: #7ee2a8;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(40px, 25%) auto;
    grid-template-rows: auto auto;
    align-items: center;
    column-gap: 10px;
    padding: 4px 0;
  }

  li.down {
    --trend: var(--danger-text);
  }

  .name {
    font-size: var(--text-14);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  svg {
    grid-row: 1 / 3;
    grid-column: 2;
    width: 100%;
    height: 28px;
  }

  polyline {
    fill: none;
    stroke: var(--trend);
    stroke-width: 1.5;
    vector-effect: non-scaling-stroke;
    stroke-linejoin: round;
  }

  .price {
    grid-column: 3;
    grid-row: 1;
    text-align: right;
    font-size: var(--text-14);
    font-variant-numeric: tabular-nums;
  }

  .pct {
    grid-column: 3;
    grid-row: 2;
    text-align: right;
    font-size: var(--text-12);
    font-variant-numeric: tabular-nums;
    color: var(--trend);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: var(--text-12);
    color: var(--text-muted);
  }

  .field input {
    min-height: 32px;
    padding: 0 10px;
    border: 1px solid var(--line);
    border-radius: var(--radius-input);
    background: var(--white-5);
    color: var(--text);
    font: inherit;
  }

  .hint,
  .empty {
    margin: 0;
    font-size: var(--text-12);
    color: var(--text-faint);
  }
</style>
