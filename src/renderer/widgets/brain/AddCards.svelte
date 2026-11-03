<script lang="ts">
  // Ajouter un cours : coller un texte (cours, notes, article, transcription de vidéo), Claude en
  // tire des cartes, on garde celles qui servent. Ou écrire une carte à la main dans un paquet.
  import ArrowLeftIcon from 'phosphor-svelte/lib/ArrowLeftIcon'
  import CheckIcon from 'phosphor-svelte/lib/CheckIcon'
  import SparkleIcon from 'phosphor-svelte/lib/SparkleIcon'
  import { untrack } from 'svelte'
  import type { Shared } from '../../lib/shared.svelte'
  import { addCards, addDeck, TEXT, type BrainData } from './data'
  import Loading from './Loading.svelte'
  import { cardsTask, run, type CardsResult } from './tasks'

  let {
    brain,
    preview,
    onclose
  }: { brain: Shared<BrainData>; preview: boolean; onclose: () => void } = $props()

  const COUNTS = [8, 15, 25] as const
  const MAX_SOURCE = 24_000

  let mode = $state<'ai' | 'hand'>('ai')
  let source = $state('')
  let count = $state<number>(15)
  let busy = $state(false)
  let error = $state<string | null>(null)
  let result = $state<CardsResult | null>(null)
  let keep = $state<boolean[]>([])
  let name = $state('')

  // À la main
  let deck = $state(untrack(() => brain.value.decks[0]?.id ?? ''))
  let q = $state('')
  let a = $state('')
  let added = $state(0)

  async function generate(): Promise<void> {
    if (busy || preview || source.trim().length < 40) return
    busy = true
    error = null
    const reply = await run(cardsTask(source.slice(0, MAX_SOURCE), count))
    busy = false
    error = reply.error
    if (reply.value) {
      result = reply.value
      keep = reply.value.cards.map(() => true)
      name = reply.value.title
    }
  }

  function save(): void {
    if (!result || preview) return
    const cards = result.cards.filter((_, i) => keep[i])
    if (!cards.length) return
    addDeck(brain.value, name || result.title, cards)
    brain.save()
    onclose()
  }

  function addByHand(): void {
    if (preview || !q.trim() || !a.trim()) return
    const target = deck || addDeck(brain.value, 'Mes cartes', [])
    addCards(brain.value, target, [{ q: q.trim(), a: a.trim() }])
    brain.save()
    deck = target
    q = ''
    a = ''
    added++
  }

  const kept = $derived(keep.filter(Boolean).length)
</script>

<div class="add">
  <div class="top">
    <button type="button" class="b-back" onclick={onclose}><ArrowLeftIcon size={13} />Retour</button
    >
    <div class="w-chips" role="group" aria-label="Façon d'ajouter">
      <button
        type="button"
        class="w-chip"
        class:selected={mode === 'ai'}
        onclick={() => (mode = 'ai')}
      >
        Depuis un cours
      </button>
      <button
        type="button"
        class="w-chip"
        class:selected={mode === 'hand'}
        onclick={() => (mode = 'hand')}
      >
        À la main
      </button>
    </div>
  </div>

  {#if mode === 'hand'}
    <div class="b-scroll">
      <label class="w-field">
        Paquet
        <select class="w-input" bind:value={deck}>
          {#each brain.value.decks as d (d.id)}<option value={d.id}>{d.name}</option>{/each}
          {#if !brain.value.decks.length}<option value="">Mes cartes (nouveau)</option>{/if}
        </select>
      </label>
      <label class="w-field">
        Question
        <textarea class="w-input" rows="2" maxlength={TEXT.q} bind:value={q}></textarea>
      </label>
      <label class="w-field">
        Réponse
        <textarea class="w-input" rows="3" maxlength={TEXT.a} bind:value={a}></textarea>
      </label>
      <div class="row">
        <button
          type="button"
          class="b-primary"
          disabled={!q.trim() || !a.trim()}
          onclick={addByHand}
        >
          Ajouter la carte
        </button>
        {#if added}<span class="w-hint">{added} ajoutée{added > 1 ? 's' : ''}</span>{/if}
      </div>
    </div>
  {:else if busy}
    <Loading
      steps={[
        'Claude lit ton cours…',
        'Il repère les notions clés…',
        'Il écrit des questions qui font réfléchir…',
        'Presque prêt…'
      ]}
    />
  {:else if result}
    <div class="row">
      <input
        class="w-input name"
        aria-label="Nom du paquet"
        maxlength={TEXT.name}
        bind:value={name}
      />
      <button type="button" class="b-primary" disabled={!kept} onclick={save}>
        <CheckIcon size={14} weight="bold" />Garder {kept} carte{kept > 1 ? 's' : ''}
      </button>
    </div>
    <ul class="cards b-scroll">
      {#each result.cards as card, i (i)}
        <li>
          <button
            type="button"
            class="pick b-panel"
            class:off={!keep[i]}
            onclick={() => (keep[i] = !keep[i])}
          >
            <span class="check" aria-hidden="true"
              >{#if keep[i]}<CheckIcon size={11} weight="bold" />{/if}</span
            >
            <span class="qa">
              <b>{card.q}</b>
              <span>{card.a}</span>
            </span>
          </button>
        </li>
      {/each}
    </ul>
  {:else}
    <textarea
      class="w-input source"
      placeholder="Colle ici un cours, tes notes, un article ou la transcription d'une vidéo YouTube…"
      maxlength={MAX_SOURCE}
      bind:value={source}></textarea>
    <div class="row">
      <span class="w-hint">Cartes</span>
      <div class="w-chips">
        {#each COUNTS as n (n)}
          <button
            type="button"
            class="w-chip"
            class:selected={count === n}
            onclick={() => (count = n)}
          >
            {n}
          </button>
        {/each}
      </div>
      <button
        type="button"
        class="b-primary go"
        disabled={preview || source.trim().length < 40}
        onclick={generate}
      >
        <SparkleIcon size={14} weight="fill" />Générer avec Claude
      </button>
    </div>
    {#if error}<p class="b-error">{error}</p>{/if}
  {/if}
</div>

<style>
  .add {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .top,
  .row {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .top {
    justify-content: space-between;
  }

  .source {
    flex: 1;
    min-height: 80px;
    line-height: 1.5;
  }

  .go {
    margin-left: auto;
  }

  .name {
    flex: 1;
    min-width: 140px;
  }

  .cards {
    margin: 0;
    padding: 0;
    list-style: none;
    gap: 6px;
  }

  .pick {
    width: 100%;
    display: flex;
    gap: 10px;
    padding: 10px 12px;
    color: var(--text);
    text-align: left;
    cursor: pointer;
    transition: opacity var(--dur-fast) var(--ease-out);
  }

  .pick.off {
    opacity: 0.45;
  }

  .check {
    flex: none;
    width: 16px;
    height: 16px;
    margin-top: 1px;
    display: grid;
    place-items: center;
    border-radius: var(--radius-check);
    border: 1px solid var(--border-accent-soft);
    background: var(--surface-accent-soft);
    color: var(--accent);
  }

  .qa {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
    font-size: var(--text-13);
    line-height: 1.45;
  }

  .qa b {
    font-weight: var(--weight-medium);
  }

  .qa span {
    color: var(--text-muted);
  }
</style>
