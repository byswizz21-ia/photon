<script lang="ts">
  // Séance de révision : la question, un temps pour chercher (tête ou écrit), la carte se retourne,
  // puis une note qui décide du prochain passage (FSRS). Raccourcis : Espace, puis 1 à 4.
  // « Encore » remet la carte en fin de séance.
  import ArrowLeftIcon from 'phosphor-svelte/lib/ArrowLeftIcon'
  import CheckCircleIcon from 'phosphor-svelte/lib/CheckCircleIcon'
  import { onMount, untrack } from 'svelte'
  import type { Shared } from '../../lib/shared.svelte'
  import { countReview, type BrainData } from './data'
  import { delay, review, type Grade } from './fsrs'

  let {
    brain,
    preview,
    ids,
    onclose
  }: { brain: Shared<BrainData>; preview: boolean; ids: string[]; onclose: () => void } = $props()

  const GRADES = [
    { grade: 1, label: 'Encore', tone: 'again' },
    { grade: 2, label: 'Difficile', tone: 'hard' },
    { grade: 3, label: 'Bien', tone: 'good' },
    { grade: 4, label: 'Facile', tone: 'easy' }
  ] as const

  // Séance figée au départ : les cartes notées ne doivent pas y revenir.
  const start = untrack(() => [...ids])
  let queue = $state(start)
  const total = start.length
  let done = $state(0)
  let revealed = $state(false)
  let attempt = $state('')
  const tally = $state<Record<Grade, number>>({ 1: 0, 2: 0, 3: 0, 4: 0 })
  let root: HTMLDivElement | undefined = $state()

  const card = $derived(brain.value.cards.find((c) => c.id === queue[0]))
  const deck = $derived(brain.value.decks.find((d) => d.id === card?.deck)?.name ?? '')
  const deltas = $derived.by(() => {
    const at = Date.now()
    return card ? GRADES.map((g) => delay(review(card, g.grade, at).due - at)) : []
  })

  onMount(() => root?.focus())

  function grade(g: Grade): void {
    if (!card || !revealed) return
    const at = new Date()
    if (!preview) {
      Object.assign(card, review(card, g, at.getTime()))
      countReview(brain.value, at)
      brain.save()
    }
    tally[g]++
    const [first, ...rest] = queue
    queue = g === 1 && first ? [...rest, first] : rest
    if (g !== 1) done++
    revealed = false
    attempt = ''
  }

  function key(event: KeyboardEvent): void {
    if (event.target instanceof HTMLTextAreaElement) {
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) revealed = true
      return
    }
    if (!revealed && (event.key === ' ' || event.key === 'Enter')) {
      event.preventDefault()
      revealed = true
    } else if (revealed && ['1', '2', '3', '4'].includes(event.key)) {
      grade(Number(event.key) as Grade)
    }
  }

  const success = $derived(
    Math.round(
      (100 * (tally[3] + tally[4])) / Math.max(1, tally[1] + tally[2] + tally[3] + tally[4])
    )
  )
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions (raccourcis clavier de la séance) -->
<div
  class="review"
  bind:this={root}
  tabindex="0"
  onkeydown={key}
  role="region"
  aria-label="Révision"
>
  <div class="top">
    <button type="button" class="b-back" onclick={onclose}
      ><ArrowLeftIcon size={13} />Terminer</button
    >
    <span class="progress"><span style:transform="scaleX({done / Math.max(1, total)})"></span></span
    >
    <span class="num">{done} / {total}</span>
  </div>

  {#if card}
    <div class="stage">
      <div class="flip" class:revealed>
        <section class="face front b-panel">
          <span class="w-label">{deck}</span>
          <p class="q">{card.q}</p>
          <textarea
            class="w-input"
            rows="3"
            placeholder="Cherche de tête, ou écris ta réponse (Ctrl + Entrée)"
            bind:value={attempt}
            tabindex={revealed ? -1 : 0}></textarea>
        </section>
        <section class="face back b-panel" aria-hidden={!revealed}>
          <span class="w-label">Réponse</span>
          <p class="q small">{card.q}</p>
          <p class="a">{card.a}</p>
          {#if attempt.trim()}
            <p class="mine"><span>Toi :</span> {attempt}</p>
          {/if}
        </section>
      </div>
    </div>

    <div class="controls">
      {#if revealed}
        {#each GRADES as g, i (g.grade)}
          <button type="button" class="grade {g.tone}" onclick={() => grade(g.grade)}>
            <span>{g.label}</span>
            <small>{deltas[i]}</small>
            <kbd>{g.grade}</kbd>
          </button>
        {/each}
      {:else}
        <button type="button" class="b-primary show" onclick={() => (revealed = true)}>
          Voir la réponse <kbd>Espace</kbd>
        </button>
      {/if}
    </div>
  {:else}
    <div class="end">
      <span class="badge"><CheckCircleIcon size={40} weight="duotone" /></span>
      <p class="b-title">Séance terminée</p>
      <p class="b-text">
        {done} carte{done > 1 ? 's' : ''} révisée{done > 1 ? 's' : ''}, {success} % retrouvées du premier
        coup. Le sommeil de cette nuit va consolider tout ça.
      </p>
      <div class="split" aria-hidden="true">
        {#each GRADES as g (g.grade)}
          <span class={g.tone} style:flex-grow={tally[g.grade]}></span>
        {/each}
      </div>
      <button type="button" class="b-primary" onclick={onclose}>Retour</button>
    </div>
  {/if}
</div>

<style>
  .review {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
    outline: none;
    --again: var(--danger);
    --hard: var(--accent-orange);
    --good: var(--rise);
    --easy: var(--accent);
  }

  .top {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .progress {
    flex: 1;
    height: 3px;
    border-radius: var(--radius-bar);
    background: var(--white-8);
    overflow: hidden;
  }

  .progress span {
    display: block;
    height: 100%;
    background: var(--accent);
    box-shadow: var(--glow-bar);
    transform-origin: 0 50%;
    transition: transform var(--dur-fill) var(--ease-out);
  }

  .num {
    font-size: var(--text-12);
    color: var(--text-faint);
    font-variant-numeric: tabular-nums;
  }

  .stage {
    flex: 1;
    min-height: 0;
    perspective: 1200px;
    display: grid;
  }

  /* Les deux faces au même endroit ; la carte tourne d'un demi-tour (transform seul). */
  .flip {
    display: grid;
    transform-style: preserve-3d;
    transition: transform var(--dur-spring-card) var(--ease-spring);
  }

  .flip.revealed {
    transform: rotateY(180deg);
  }

  .face {
    grid-area: 1 / 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 18px;
    overflow-y: auto;
    backface-visibility: hidden;
    background: var(--glass-sheen), var(--white-4);
  }

  .back {
    transform: rotateY(180deg);
    box-shadow: var(--glow-card);
  }

  .q {
    margin: 0;
    font-size: var(--text-18);
    font-weight: var(--weight-medium);
    line-height: 1.35;
    text-wrap: balance;
  }

  .q.small {
    font-size: var(--text-13);
    color: var(--text-faint);
  }

  .a {
    margin: 0;
    font-size: var(--text-15);
    line-height: 1.55;
  }

  .mine {
    margin: auto 0 0;
    padding: 10px 12px;
    border-radius: var(--radius-input);
    background: var(--black-20);
    font-size: var(--text-13);
    color: var(--text-muted);
    white-space: pre-line;
  }

  .mine span {
    color: var(--text-faint);
  }

  textarea {
    margin-top: auto;
  }

  .controls {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
  }

  .show {
    grid-column: 1 / -1;
    min-height: var(--control-h);
  }

  kbd {
    padding: 1px 6px;
    border-radius: var(--radius-kbd);
    background: var(--black-20);
    font: inherit;
    font-size: var(--text-11);
    opacity: 0.75;
  }

  .grade {
    position: relative;
    min-height: 48px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    border: 1px solid color-mix(in srgb, var(--tone) 40%, transparent);
    border-radius: var(--radius-input);
    background: color-mix(in srgb, var(--tone) 10%, transparent);
    color: var(--text);
    font-size: var(--text-13);
    font-weight: var(--weight-medium);
    cursor: pointer;
    animation: pop var(--dur-spring-card) var(--ease-spring) both;
    transition: transform var(--dur-spring) var(--ease-spring);
  }

  .grade:hover {
    background: color-mix(in srgb, var(--tone) 18%, transparent);
  }

  .grade:active {
    transform: scale(var(--press-scale));
  }

  .grade small {
    color: var(--tone);
    font-size: var(--text-11);
    font-variant-numeric: tabular-nums;
  }

  .grade kbd {
    position: absolute;
    top: 4px;
    right: 4px;
  }

  .grade:nth-child(2) {
    animation-delay: 30ms;
  }
  .grade:nth-child(3) {
    animation-delay: 60ms;
  }
  .grade:nth-child(4) {
    animation-delay: 90ms;
  }

  .again {
    --tone: var(--again);
  }
  .hard {
    --tone: var(--hard);
  }
  .good {
    --tone: var(--good);
  }
  .easy {
    --tone: var(--easy);
  }

  .end {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    text-align: center;
  }

  .end .b-text {
    max-width: 36ch;
  }

  .badge {
    display: grid;
    color: var(--rise);
    filter: drop-shadow(0 0 14px var(--rise));
    animation: pop var(--dur-spring-card) var(--ease-spring) both;
  }

  .split {
    width: min(260px, 80%);
    height: 6px;
    display: flex;
    gap: 2px;
    border-radius: var(--radius-bar);
    overflow: hidden;
  }

  .split span {
    flex-basis: 0;
    background: var(--tone);
  }

  @keyframes pop {
    from {
      opacity: 0;
      transform: translateY(6px) scale(0.94);
    }
  }
</style>
