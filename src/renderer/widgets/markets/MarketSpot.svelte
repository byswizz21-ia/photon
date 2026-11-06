<script lang="ts">
  // Design « Vedette » : un actif en grand, sa courbe sur la période choisie (survol = cours du
  // point), flèches ou molette pour passer d'un actif à l'autre.
  import CaretLeftIcon from 'phosphor-svelte/lib/CaretLeftIcon'
  import CaretRightIcon from 'phosphor-svelte/lib/CaretRightIcon'
  import type { MarketQuote, MarketRange } from '../../../shared/api'
  import Chart from './Chart.svelte'
  import { baseOf, seriesOf, status } from './chart'
  import Price from './Price.svelte'
  import Ranges from './Ranges.svelte'

  let { quotes, missing, now }: { quotes: MarketQuote[]; missing: string[]; now: number } = $props()

  // Actif choisi retenu par symbole : la liste grandit quand un cours arrive en retard.
  let symbol = $state('')
  let range = $state<MarketRange>('1J')
  let hover = $state<number | null>(null)

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

  function step(by: number): void {
    symbol = quotes[(current + by + quotes.length) % quotes.length]?.symbol ?? ''
    hover = null
  }

  // Molette : un actif par cran, pas plus d'un tous les 220 ms (pavés tactiles).
  let wheeled = 0
  function wheel(event: WheelEvent): void {
    if (!event.deltaY || quotes.length < 2) return
    event.preventDefault()
    if (event.timeStamp - wheeled < 220) return
    wheeled = event.timeStamp
    step(event.deltaY > 0 ? 1 : -1)
  }
</script>

<div class="spot" onwheel={wheel}>
  <div class="top">
    <span class="w-label">Cours</span>
    <span class="state" title={market.long}
      ><span class="dot" class:open={market.open}></span>{market.short}</span
    >
  </div>
  <p class="name">{quote.name}<span>{quote.symbol}</span></p>
  {#if missing.length}<p class="missing">Introuvable : {missing.join(', ')}</p>{/if}
  <Price {quote} {line} {range} {base} {hover} />
  {#if line}
    <Chart {line} {base} previous={range === '1J' ? quote.previous : null} bind:hover />
  {:else}
    <p class="w-message">
      {range === '1J' ? 'Pas encore de cours aujourd’hui.' : 'Lecture de l’historique…'}
    </p>
  {/if}
  <div class="bottom">
    <Ranges value={range} onpick={(r) => ((range = r), (hover = null))} />
    {#if quotes.length > 1}
      <div class="nav">
        <button type="button" class="w-icon" aria-label="Précédent" onclick={() => step(-1)}
          ><CaretLeftIcon size={12} weight="bold" /></button
        >
        <span>{current + 1} / {quotes.length}</span>
        <button type="button" class="w-icon" aria-label="Suivant" onclick={() => step(1)}
          ><CaretRightIcon size={12} weight="bold" /></button
        >
      </div>
    {/if}
  </div>
</div>

<style>
  .spot {
    box-sizing: border-box;
    height: 100%;
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
  }

  .top,
  .bottom {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .state {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: var(--text-11);
    color: var(--text-faint);
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--text-faint);
  }

  .dot.open {
    background: var(--rise);
    box-shadow: 0 0 8px var(--rise);
  }

  .missing {
    margin: 0 0 4px;
    font-size: var(--text-11);
    color: var(--text-faint);
  }

  .name {
    display: flex;
    align-items: baseline;
    gap: 8px;
    min-width: 0;
    margin: 12px 0 6px;
    font-size: var(--text-14);
    font-weight: var(--weight-medium);
    white-space: nowrap;
  }

  .name span {
    font-size: var(--text-12);
    font-weight: var(--weight-regular);
    color: var(--text-faint);
  }

  .spot :global(.chart),
  .w-message {
    margin: 14px 0 12px;
  }

  .w-message {
    flex: 1;
    display: grid;
    place-items: center;
  }

  .nav {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .nav span {
    min-width: 30px;
    text-align: center;
    font-size: var(--text-11);
    color: var(--text-faint);
    font-variant-numeric: tabular-nums;
  }

  .nav .w-icon {
    width: 26px;
    height: 26px;
    border-radius: 50%;
  }
</style>
