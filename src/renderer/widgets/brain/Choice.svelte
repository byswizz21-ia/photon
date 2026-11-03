<script lang="ts">
  // Une question à 4 options. Avec `confidence` : choisir une option puis sa confiance avant de
  // valider (calibration). Ensuite : bonne réponse, explication, bouton Suivant.
  import CheckIcon from 'phosphor-svelte/lib/CheckIcon'
  import XIcon from 'phosphor-svelte/lib/XIcon'
  import { CONFIDENCES } from './data'
  import type { Mcq } from './tasks'

  let {
    mcq,
    confidence = false,
    next = 'Suivant',
    onanswer,
    onnext
  }: {
    mcq: Mcq
    confidence?: boolean
    next?: string
    onanswer: (correct: boolean, confidence: number) => void
    onnext: () => void
  } = $props()

  let picked = $state<number | null>(null)
  let sure = $state<number | null>(null)
  let answered = $state(false)

  function pick(i: number): void {
    if (answered) return
    picked = i
    if (!confidence) validate()
  }

  function validate(): void {
    if (picked === null || answered || (confidence && sure === null)) return
    answered = true
    onanswer(picked === mcq.answer, sure ?? 0)
  }

  const LETTERS = ['A', 'B', 'C', 'D']
</script>

<div class="choice">
  <p class="q">{mcq.q}</p>
  <div class="options">
    {#each mcq.options as option, i (i)}
      <button
        type="button"
        class="option"
        class:picked={picked === i && !answered}
        class:right={answered && i === mcq.answer}
        class:wrong={answered && picked === i && i !== mcq.answer}
        disabled={answered}
        onclick={() => pick(i)}
      >
        <span class="letter">
          {#if answered && i === mcq.answer}<CheckIcon size={11} weight="bold" />
          {:else if answered && picked === i}<XIcon size={11} weight="bold" />
          {:else}{LETTERS[i]}{/if}
        </span>
        <span>{option}</span>
      </button>
    {/each}
  </div>

  {#if confidence && !answered}
    <div class="sure">
      <span class="w-hint">Sûr à</span>
      <div class="w-chips">
        {#each CONFIDENCES as c (c)}
          <button
            type="button"
            class="w-chip"
            class:selected={sure === c}
            onclick={() => (sure = c)}
          >
            {c} %
          </button>
        {/each}
      </div>
      <button
        type="button"
        class="b-primary"
        disabled={picked === null || sure === null}
        onclick={validate}>Valider</button
      >
    </div>
  {/if}

  {#if answered}
    <div class="why b-panel" class:ok={picked === mcq.answer}>
      <p class="b-text">{mcq.why}</p>
      <button type="button" class="b-primary" onclick={onnext}>{next}</button>
    </div>
  {/if}
</div>

<style>
  .choice {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .q {
    margin: 0;
    font-size: var(--text-15);
    font-weight: var(--weight-medium);
    line-height: 1.4;
    text-wrap: balance;
  }

  .options {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px;
  }

  @container (max-width: 470px) {
    .options {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  .option {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 40px;
    padding: 6px 10px;
    border: 1px solid var(--line);
    border-radius: var(--radius-input);
    background: var(--white-4);
    color: var(--text);
    font-size: var(--text-13);
    line-height: 1.35;
    text-align: left;
    cursor: pointer;
    transition: transform var(--dur-spring) var(--ease-spring);
  }

  .option:not(:disabled):hover {
    background: var(--surface-hover);
  }

  .option:not(:disabled):active {
    transform: scale(var(--press-scale));
  }

  .option:disabled {
    cursor: default;
  }

  .letter {
    flex: none;
    width: 20px;
    height: 20px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: var(--white-8);
    color: var(--text-muted);
    font-size: var(--text-11);
    font-weight: var(--weight-semibold);
  }

  .picked {
    border-color: var(--border-accent-soft);
    background: var(--surface-accent-soft);
  }

  .picked .letter {
    background: var(--accent);
    color: var(--on-accent);
  }

  .right {
    border-color: color-mix(in srgb, var(--rise) 55%, transparent);
    background: color-mix(in srgb, var(--rise) 12%, transparent);
  }

  .right .letter {
    background: var(--rise);
    color: var(--ink);
  }

  .wrong {
    border-color: var(--danger-border-soft);
    background: var(--danger-surface-soft);
  }

  .wrong .letter {
    background: var(--danger);
    color: var(--white);
  }

  .sure {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .sure .b-primary {
    margin-left: auto;
  }

  .why {
    display: flex;
    align-items: flex-end;
    gap: 12px;
    padding: 12px 14px;
    border-color: var(--danger-border-soft);
    animation: rise var(--dur-swap) var(--ease-out) both;
  }

  .why.ok {
    border-color: color-mix(in srgb, var(--rise) 45%, transparent);
  }

  .why .b-text {
    flex: 1;
  }

  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
  }
</style>
