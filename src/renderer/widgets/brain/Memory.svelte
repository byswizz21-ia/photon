<script lang="ts">
  // Onglet Mémoire (second cerveau) : cartes à revoir, carte des connaissances, paquets.
  // Ajouter : Claude tire les cartes d'un cours collé. Réviser : séance en répétition espacée.
  import BrainIcon from 'phosphor-svelte/lib/BrainIcon'
  import PlusIcon from 'phosphor-svelte/lib/PlusIcon'
  import TrashIcon from 'phosphor-svelte/lib/TrashIcon'
  import type { Shared } from '../../lib/shared.svelte'
  import AddCards from './AddCards.svelte'
  import Constellation from './Constellation.svelte'
  import { dueCards, NEW_PER_DAY, removeDeck, retention, stars, type BrainData } from './data'
  import Review from './Review.svelte'

  let {
    brain,
    now,
    preview,
    reviewDeck = $bindable()
  }: {
    brain: Shared<BrainData>
    now: Date
    preview: boolean
    reviewDeck: string | null
  } = $props()

  let view = $state<'home' | 'add'>('home')
  let queue = $state<string[] | null>(null) // séance en cours : ids des cartes
  let confirm = $state<string | null>(null) // paquet dont on confirme la suppression

  const time = $derived(now.getTime())
  const due = $derived(dueCards(brain.value, time))
  const waiting = $derived(due.filter((c) => c.reps > 0).length)
  const fresh = $derived(due.length - waiting)
  const memory = $derived(retention(brain.value.cards, time))
  const sky = $derived(stars(brain.value, time))

  function start(deck?: string): void {
    const ids = dueCards(brain.value, Date.now(), deck).map((c) => c.id)
    if (ids.length) queue = ids
  }

  // Envoyé par le coach : réviser tout de suite le paquet d'une étape.
  $effect(() => {
    if (!reviewDeck) return
    start(reviewDeck)
    reviewDeck = null
  })

  function remove(id: string): void {
    if (preview) return
    if (confirm !== id) {
      confirm = id
      return
    }
    removeDeck(brain.value, id)
    brain.save()
    confirm = null
  }
</script>

{#if queue}
  <Review {brain} {preview} ids={queue} onclose={() => (queue = null)} />
{:else if view === 'add'}
  <AddCards {brain} {preview} onclose={() => (view = 'home')} />
{:else}
  <div class="home">
    <section class="hero">
      <div class="count">
        <span class="b-score">{due.length}</span>
        <span class="what">
          {due.length === 0
            ? 'Rien à revoir'
            : due.length === 1
              ? 'carte à revoir'
              : 'cartes à revoir'}
          {#if fresh}<small>dont {fresh} nouvelle{fresh > 1 ? 's' : ''}</small>{/if}
        </span>
      </div>
      <div class="meter" title="Chances moyennes de te souvenir de tes cartes déjà vues">
        <span>Mémoire</span>
        <span class="bar"><span style:transform="scaleX({memory ?? 0})"></span></span>
        <b>{memory === null ? '–' : `${Math.round(memory * 100)} %`}</b>
      </div>
      <div class="actions">
        <button type="button" class="b-primary" disabled={!due.length} onclick={() => start()}>
          <BrainIcon size={15} weight="fill" />Réviser
        </button>
        <button type="button" class="b-ghost" disabled={preview} onclick={() => (view = 'add')}>
          <PlusIcon size={14} weight="bold" />Ajouter un cours
        </button>
      </div>
      <p class="tip">
        Se tester bat la relecture. Au-delà de {NEW_PER_DAY} nouvelles cartes par jour, elles attendent
        le lendemain.
      </p>
    </section>

    <section class="sky b-panel">
      {#if sky.length}
        <Constellation stars={sky} onpick={(id) => start(id)} />
      {:else}
        <p class="w-message">Ajoute un cours pour allumer ta première étoile.</p>
      {/if}
    </section>

    <ul class="decks w-list">
      {#each sky as deck (deck.id)}
        <li>
          <button type="button" class="deck" onclick={() => start(deck.id)}>
            <span class="dot" class:new={deck.retention === null}></span>
            <span class="deck-name">{deck.name}</span>
            <span class="n">{deck.count} cartes</span>
            {#if deck.due}<span class="due">{deck.due}</span>{/if}
          </button>
          {#if !preview}
            <button
              type="button"
              class="w-icon"
              class:danger={confirm === deck.id}
              aria-label={confirm === deck.id
                ? `Confirmer la suppression de ${deck.name}`
                : `Supprimer ${deck.name}`}
              title={confirm === deck.id ? 'Cliquer encore pour supprimer' : 'Supprimer'}
              onclick={() => remove(deck.id)}
              onblur={() => confirm === deck.id && (confirm = null)}
            >
              <TrashIcon size={13} />
            </button>
          {/if}
        </li>
      {/each}
    </ul>
  </div>
{/if}

<style>
  .home {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.25fr);
    grid-template-rows: auto minmax(0, 1fr);
    gap: 14px;
  }

  .hero {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
  }

  .count {
    display: flex;
    align-items: baseline;
    gap: 10px;
  }

  .count .b-score {
    font-size: var(--text-display-m);
  }

  .what {
    display: flex;
    flex-direction: column;
    font-size: var(--text-13);
    color: var(--text-muted);
  }

  .what small {
    font-size: var(--text-12);
    color: var(--text-faint);
  }

  .meter {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 10px;
    font-size: var(--text-12);
    color: var(--text-faint);
  }

  .meter b {
    color: var(--text);
    font-weight: var(--weight-medium);
    font-variant-numeric: tabular-nums;
  }

  .bar {
    height: 4px;
    border-radius: var(--radius-bar);
    background: var(--white-8);
    overflow: hidden;
  }

  .bar span {
    display: block;
    height: 100%;
    background: linear-gradient(90deg, var(--danger), var(--accent-orange), var(--rise));
    transform-origin: 0 50%;
    transition: transform var(--dur-fill) var(--ease-out);
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .tip {
    margin: 0;
    font-size: var(--text-12);
    line-height: 1.5;
    color: var(--text-faint);
  }

  .sky {
    grid-row: span 2;
    min-height: 0;
    display: grid;
    padding: 10px;
    background:
      radial-gradient(
        ellipse 70% 60% at 50% 45%,
        color-mix(in srgb, var(--glow-secondary) 12%, transparent),
        transparent 70%
      ),
      var(--black-20);
  }

  .decks {
    gap: 2px;
  }

  .decks li {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .deck {
    flex: 1;
    min-width: 0;
    min-height: 32px;
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 0 8px;
    border: 0;
    border-radius: var(--radius-row);
    background: none;
    color: var(--text);
    font-size: var(--text-13);
    text-align: left;
    cursor: pointer;
  }

  .deck:hover {
    background: var(--surface-hover);
  }

  .dot {
    flex: none;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--rise);
    box-shadow: 0 0 6px var(--rise);
  }

  .dot.new {
    background: var(--accent);
    box-shadow: var(--glow-dot);
  }

  .deck-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .n {
    color: var(--text-faint);
    font-size: var(--text-12);
    font-variant-numeric: tabular-nums;
  }

  .due {
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    box-sizing: border-box;
    display: grid;
    place-items: center;
    border-radius: var(--radius-pill);
    background: var(--accent);
    color: var(--on-accent);
    font-size: var(--text-11);
    font-weight: var(--weight-semibold);
  }

  .w-icon.danger {
    color: var(--danger-text);
    background: var(--danger-surface);
  }

  /* Carte étroite ou basse : une colonne, la carte du ciel au milieu. */
  @container (max-width: 520px) {
    .home {
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: auto minmax(110px, 1fr) minmax(0, 0.8fr);
    }

    .sky {
      grid-row: auto;
    }

    .tip {
      display: none;
    }
  }
</style>
