<script lang="ts">
  // Grand cours (chiffres qui défilent) et sa variation sur la période ; au survol de la courbe :
  // le cours, la variation et l'heure du point survolé.
  import ArrowDownRightIcon from 'phosphor-svelte/lib/ArrowDownRightIcon'
  import ArrowUpRightIcon from 'phosphor-svelte/lib/ArrowUpRightIcon'
  import type { MarketQuote, MarketRange, MarketSeries } from '../../../shared/api'
  import RollingNumber from '../../lib/RollingNumber.svelte'
  import { currencyOf, money, percent, RANGE_TEXT, signed, timeText } from './chart'

  let {
    quote,
    line,
    range,
    base,
    hover
  }: {
    quote: MarketQuote
    line: MarketSeries | null
    range: MarketRange
    base: number
    hover: number | null
  } = $props()

  const cur = $derived(currencyOf(quote))
  const at = $derived(line && hover !== null ? Math.min(hover, line.points.length - 1) : null)
  const value = $derived(at === null || !line ? quote.price : (line.points[at] ?? quote.price))
  const up = $derived(value >= base)
</script>

<div class="price" class:down={!up}>
  <p class="big">
    {#if at === null}<RollingNumber value={money(quote.price, cur)} />
    {:else}<span class="still">{money(value, cur)}</span>{/if}
  </p>
  <p class="change">
    <span class="pill">
      {#if up}<ArrowUpRightIcon size={11} weight="bold" />{:else}<ArrowDownRightIcon
          size={11}
          weight="bold"
        />{/if}
      {percent(((value - base) / base) * 100)}
    </span>
    <span class="abs">{signed(value - base, cur, quote.price)}</span>
    <span class="when"
      >{at === null || !line ? RANGE_TEXT[range] : timeText(line.times[at] ?? 0, range)}</span
    >
  </p>
</div>

<style>
  .price {
    --trend: var(--rise);
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
  }

  .price.down {
    --trend: var(--danger-text);
  }

  p {
    margin: 0;
  }

  .big {
    height: 1em;
    font-size: var(--price-size, calc(34px * var(--font-scale)));
    font-weight: var(--weight-light);
    letter-spacing: var(--tracking-display);
    line-height: 1;
    white-space: nowrap;
  }

  .still {
    font-variant-numeric: tabular-nums;
  }

  .change {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    font-size: var(--text-12);
    white-space: nowrap;
  }

  .pill {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 20px;
    padding: 0 8px;
    border-radius: var(--radius-pill);
    background: color-mix(in srgb, var(--trend) 14%, transparent);
    color: var(--trend);
    font-weight: var(--weight-medium);
    font-variant-numeric: tabular-nums;
  }

  .abs {
    color: var(--trend);
    font-variant-numeric: tabular-nums;
  }

  .when {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--text-faint);
  }
</style>
