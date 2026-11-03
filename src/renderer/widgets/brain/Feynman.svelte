<script lang="ts">
  // Méthode Feynman : expliquer une notion avec ses mots, Claude repère les trous et le flou, puis
  // propose une explication modèle, à garder en carte de révision.
  import CardsIcon from 'phosphor-svelte/lib/CardsIcon'
  import CheckIcon from 'phosphor-svelte/lib/CheckIcon'
  import SparkleIcon from 'phosphor-svelte/lib/SparkleIcon'
  import type { Shared } from '../../lib/shared.svelte'
  import { addCards, addDeck, type BrainData } from './data'
  import Gauge from './Gauge.svelte'
  import Loading from './Loading.svelte'
  import { feynmanTask, run, type Explanation } from './tasks'

  let {
    brain,
    preview,
    concept,
    why = '',
    result,
    onresult
  }: {
    brain: Shared<BrainData>
    preview: boolean
    concept: string
    why?: string
    result: Explanation | null
    onresult: (result: Explanation) => void
  } = $props()

  const DECK = 'Feynman'

  let text = $state('')
  let busy = $state(false)
  let error = $state<string | null>(null)
  let kept = $state(false)

  const words = $derived(text.trim() ? text.trim().split(/\s+/).length : 0)

  async function check(): Promise<void> {
    if (busy || preview || words < 15) return
    busy = true
    error = null
    const reply = await run(feynmanTask(concept, text))
    busy = false
    error = reply.error
    if (reply.value) onresult(reply.value)
  }

  function keep(): void {
    if (!result || preview || kept) return
    const card = { q: `Explique simplement : ${concept}`, a: result.better }
    const deck = brain.value.decks.find((d) => d.name === DECK)
    if (deck) addCards(brain.value, deck.id, [card])
    else addDeck(brain.value, DECK, [card])
    brain.save()
    kept = true
  }
</script>

<div class="feynman">
  <div class="head">
    <p class="b-title">{concept}</p>
    {#if why}<p class="w-hint">{why}</p>{/if}
  </div>

  {#if result}
    <div class="result">
      <div class="verdict b-panel">
        <Gauge value={result.score} />
        <p class="b-text">{result.summary}</p>
      </div>
      {#if result.gaps.length}
        <div class="list">
          <span class="w-label">Ce qui manque</span>
          <ul>
            {#each result.gaps as gap (gap)}<li>{gap}</li>{/each}
          </ul>
        </div>
      {/if}
      {#if result.vague.length}
        <div class="list vague">
          <span class="w-label">Trop flou</span>
          <ul>
            {#each result.vague as v (v)}<li>{v}</li>{/each}
          </ul>
        </div>
      {/if}
      <div class="model b-panel">
        <span class="w-label">Explication modèle</span>
        <p class="b-text">{result.better}</p>
        <button type="button" class="b-ghost" disabled={kept || preview} onclick={keep}>
          {#if kept}<CheckIcon size={14} weight="bold" />Ajoutée au paquet Feynman
          {:else}<CardsIcon size={14} />Garder en carte{/if}
        </button>
      </div>
    </div>
  {:else if busy}
    <Loading
      steps={[
        'Claude lit ton explication…',
        'Il cherche les trous…',
        'Il prépare une version modèle…'
      ]}
    />
  {:else}
    <textarea
      class="w-input"
      rows="6"
      placeholder="Explique-le comme à quelqu'un de 12 ans : avec tes mots, sans jargon, avec un exemple."
      bind:value={text}></textarea>
    <div class="row">
      <span class="w-hint"
        >{words} mot{words > 1 ? 's' : ''}{words < 15 ? ' · 15 au moins' : ''}</span
      >
      <button type="button" class="b-primary" disabled={preview || words < 15} onclick={check}>
        <SparkleIcon size={14} weight="fill" />Faire corriger
      </button>
    </div>
    {#if error}<p class="b-error">{error}</p>{/if}
  {/if}
</div>

<style>
  .feynman {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .head {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  textarea {
    line-height: 1.5;
  }

  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .result {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .verdict {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 14px;
  }

  .list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  li {
    position: relative;
    padding-left: 16px;
    font-size: var(--text-13);
    line-height: 1.45;
    color: var(--text-secondary);
  }

  li::before {
    content: '';
    position: absolute;
    left: 2px;
    top: 0.55em;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent-orange);
  }

  .vague li::before {
    background: var(--accent-violet);
  }

  .model {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    padding: 12px 14px;
    border-color: var(--border-accent-soft);
    box-shadow: var(--glow-card);
  }
</style>
