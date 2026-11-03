<script lang="ts">
  // Un clic sur la zone du milieu (ou Entrée, Espace) lance : dés, pièce, nom ou nombre.
  // Le mode se choisit d'un clic ; ses réglages (nombre de dés, liste, bornes) en mode édition.
  // Résultats et noms déjà tirés : en mémoire seulement, rien n'est enregistré.
  import type { Component } from 'svelte'
  import DiceFiveIcon from 'phosphor-svelte/lib/DiceFiveIcon'
  import DiceFourIcon from 'phosphor-svelte/lib/DiceFourIcon'
  import DiceOneIcon from 'phosphor-svelte/lib/DiceOneIcon'
  import DiceSixIcon from 'phosphor-svelte/lib/DiceSixIcon'
  import DiceThreeIcon from 'phosphor-svelte/lib/DiceThreeIcon'
  import DiceTwoIcon from 'phosphor-svelte/lib/DiceTwoIcon'
  import type { WidgetProps } from '../types'
  import type { DiceMode, DiceSettings } from './manifest'
  import { draw, names, randomInt } from './random'

  let { settings, editing, save }: WidgetProps<DiceSettings> = $props()

  const MODES: [DiceMode, string][] = [
    ['dice', 'Dés'],
    ['coin', 'Pièce'],
    ['list', 'Liste'],
    ['number', 'Nombre']
  ]
  const FACES = [4, 6, 8, 10, 12, 20, 100]
  const PIPS: Component[] = [
    DiceOneIcon,
    DiceTwoIcon,
    DiceThreeIcon,
    DiceFourIcon,
    DiceFiveIcon,
    DiceSixIcon
  ]

  const clamp = (n: number, min: number, max: number): number =>
    Math.min(max, Math.max(min, Math.round(Number.isFinite(n) ? n : min)))
  const count = $derived(clamp(settings.count, 1, 6))
  const faces = $derived(FACES.includes(settings.faces) ? settings.faces : 6)
  const people = $derived(names(settings.list))
  const low = $derived(Math.min(settings.min, settings.max))
  const high = $derived(Math.max(settings.min, settings.max))

  type Result = { mode: DiceMode; dice: number[]; text: string }
  let result = $state<Result | null>(null)
  let history = $state<string[]>([])
  let drawn = $state<string[]>([])
  let rolls = $state(0) // relance l'animation à chaque tirage

  // Changer la liste ou le mode remet les tirages sans remise à zéro.
  $effect(() => {
    void settings.list
    void settings.mode
    drawn = []
    result = null
    history = []
  })

  function roll(): void {
    let next: Result | null = null
    if (settings.mode === 'dice') {
      const dice = Array.from({ length: count }, () => randomInt(faces) + 1)
      next = { mode: 'dice', dice, text: dice.join(' + ') }
    } else if (settings.mode === 'coin') {
      next = { mode: 'coin', dice: [], text: randomInt(2) ? 'Pile' : 'Face' }
    } else if (settings.mode === 'list') {
      const picked = settings.unique
        ? draw(people, drawn)
        : people.length
          ? { name: people[randomInt(people.length)] as string, drawn: [] }
          : null
      if (picked) {
        drawn = picked.drawn
        next = { mode: 'list', dice: [], text: picked.name }
      }
    } else {
      next = { mode: 'number', dice: [], text: String(low + randomInt(high - low + 1)) }
    }
    if (!next) return
    if (result) history = [result.text, ...history].slice(0, 4)
    result = next
    rolls++
  }

  const total = $derived(result?.dice.reduce((a, b) => a + b, 0) ?? 0)
  const ready = $derived(settings.mode !== 'list' || people.length > 0)
  const left = $derived(people.filter((name) => !drawn.includes(name)).length)
</script>

<div class="w-body">
  <div class="w-head">
    <span class="w-label">Tirage</span>
    {#if settings.mode === 'list' && settings.unique && people.length}
      <span class="w-hint">{left} / {people.length} restants</span>
    {:else if settings.mode === 'dice'}
      <span class="w-hint">{count} d{faces}</span>
    {/if}
  </div>

  <div class="w-chips" role="radiogroup" aria-label="Type de tirage">
    {#each MODES as [mode, label] (mode)}
      <button
        type="button"
        class="w-chip"
        class:selected={settings.mode === mode}
        role="radio"
        aria-checked={settings.mode === mode}
        onclick={() => save({ ...settings, mode })}>{label}</button
      >
    {/each}
  </div>

  {#if editing && settings.mode === 'dice'}
    <div class="w-row" data-no-drag>
      <label class="w-field">
        Dés
        <input
          class="w-input"
          type="number"
          min="1"
          max="6"
          value={count}
          onchange={(e) => save({ ...settings, count: clamp(Number(e.currentTarget.value), 1, 6) })}
        />
      </label>
      <label class="w-field">
        Faces
        <select
          class="w-input"
          value={faces}
          onchange={(e) => save({ ...settings, faces: Number(e.currentTarget.value) })}
        >
          {#each FACES as n (n)}<option value={n}>{n}</option>{/each}
        </select>
      </label>
    </div>
  {:else if editing && settings.mode === 'number'}
    <div class="w-row" data-no-drag>
      <label class="w-field">
        De
        <input
          class="w-input"
          type="number"
          value={settings.min}
          onchange={(e) =>
            save({ ...settings, min: clamp(Number(e.currentTarget.value), -1e9, 1e9) })}
        />
      </label>
      <label class="w-field">
        À
        <input
          class="w-input"
          type="number"
          value={settings.max}
          onchange={(e) =>
            save({ ...settings, max: clamp(Number(e.currentTarget.value), -1e9, 1e9) })}
        />
      </label>
    </div>
  {/if}

  {#if settings.mode === 'list' && (editing || !people.length)}
    <textarea
      class="w-input list"
      data-no-drag
      value={settings.list}
      placeholder="Un nom par ligne"
      aria-label="Noms à tirer, un par ligne"
      onchange={(e) => save({ ...settings, list: e.currentTarget.value.slice(0, 5000) })}
    ></textarea>
    <label class="w-row check">
      <input
        type="checkbox"
        checked={settings.unique}
        onchange={(e) => save({ ...settings, unique: e.currentTarget.checked })}
      />
      Sans remise (chacun sort une fois)
    </label>
  {:else}
    <button
      type="button"
      class="stage"
      disabled={!ready}
      onclick={roll}
      aria-label="Lancer"
      aria-live="polite"
    >
      {#key rolls}
        <span class="result">
          {#if !result}
            <span class="idle">Clic pour {settings.mode === 'list' ? 'tirer' : 'lancer'}</span>
          {:else if result.mode === 'dice'}
            <span class="dice">
              {#each result.dice as value, i (i)}
                {#if faces === 6}
                  {@const Pip = PIPS[value - 1] ?? DiceOneIcon}
                  <Pip size={count > 3 ? 36 : 52} weight="fill" aria-label={String(value)} />
                {:else}
                  <span class="face">{value}</span>
                {/if}
              {/each}
            </span>
            {#if result.dice.length > 1}<span class="total">Total {total}</span>{/if}
          {:else}
            <span class="text">{result.text}</span>
          {/if}
        </span>
      {/key}
    </button>
    {#if history.length}
      <p class="w-hint history">Avant : {history.join(' · ')}</p>
    {/if}
  {/if}
</div>

<style>
  .stage {
    flex: 1;
    min-height: 0;
    display: grid;
    place-items: center;
    padding: 0;
    border: 0;
    border-radius: var(--radius-tile);
    background: var(--white-4);
    color: var(--text);
    cursor: pointer;
    transition: transform var(--dur-spring) var(--ease-spring);
  }

  .stage:hover {
    background: var(--white-6);
  }

  .stage:active {
    transform: scale(var(--press-scale));
    transition-duration: var(--dur-press);
  }

  .stage:disabled {
    cursor: default;
  }

  .result {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    animation: pop var(--dur-spring) var(--ease-spring);
  }

  @keyframes pop {
    from {
      opacity: 0;
      transform: scale(0.6) rotate(-12deg);
    }
  }

  .idle {
    font-size: var(--text-13);
    color: var(--text-faint);
  }

  .dice {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px;
    color: var(--accent);
  }

  .face {
    min-width: 40px;
    height: 40px;
    display: grid;
    place-items: center;
    padding: 0 6px;
    border-radius: var(--radius-icon);
    background: var(--accent);
    color: var(--on-accent);
    font-size: var(--text-18);
    font-weight: var(--weight-semibold);
    font-variant-numeric: tabular-nums;
  }

  .total {
    font-size: var(--text-13);
    color: var(--text-muted);
  }

  .text {
    max-width: 100%;
    padding: 0 8px;
    font-size: clamp(22px, 14cqmin, 44px);
    font-weight: var(--weight-light);
    overflow-wrap: anywhere;
    text-align: center;
  }

  .history {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .list {
    flex: 1;
    min-height: 60px;
  }

  .check {
    font-size: var(--text-12);
    color: var(--text-muted);
    cursor: pointer;
  }

  .check input {
    margin: 0;
    accent-color: var(--accent);
  }

  @container (max-height: 180px) {
    .history {
      display: none;
    }
  }
</style>
