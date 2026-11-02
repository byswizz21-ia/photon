<script lang="ts">
  // Moyenne en grand, objectif et note à viser, notes en pastilles (clic : retirer), saisie
  // « 15 » ou « 7,5/10 » avec son coefficient. Mode édition : nom de la matière et objectif.
  import XIcon from 'phosphor-svelte/lib/XIcon'
  import type { WidgetProps } from '../types'
  import { average, cleanGrades, mark, needed, parseGrade } from './grades'
  import type { GradesSettings } from './manifest'

  let { settings, editing, save }: WidgetProps<GradesSettings> = $props()

  const grades = $derived(cleanGrades(settings.grades))
  const target = $derived(settings.target > 0 && settings.target <= 20 ? settings.target : 12)
  const mean = $derived(average(grades))

  let draft = $state('')
  let coef = $state('1')
  const parsed = $derived(parseGrade(draft))
  const nextCoef = $derived(Math.max(0.1, Number(coef.replace(',', '.')) || 1))
  const aim = $derived(needed(grades, target, nextCoef))

  function add(): void {
    if (!parsed) return
    save({ ...settings, grades: [...grades, { ...parsed, coef: nextCoef }] })
    draft = ''
  }

  const remove = (index: number): void =>
    save({ ...settings, grades: grades.filter((_, i) => i !== index) })

  const onEnter = (event: KeyboardEvent): void => {
    if (event.key === 'Enter') add()
  }
</script>

<div class="widget">
  <span class="label">{settings.title || 'Moyenne'}</span>
  {#if editing}
    <label class="field" data-no-drag>
      Matière
      <input
        value={settings.title}
        maxlength="40"
        placeholder="Maths, Général…"
        onchange={(event) => save({ ...settings, title: event.currentTarget.value.trim() })}
      />
    </label>
    <label class="field" data-no-drag>
      Objectif (sur 20)
      <input
        type="number"
        min="1"
        max="20"
        step="0.5"
        value={target}
        onchange={(event) => save({ ...settings, target: Number(event.currentTarget.value) })}
      />
    </label>
  {:else}
    <p class="mean" class:below={mean !== null && mean < target}>
      {mean === null ? '—' : mark(mean)}<span class="unit">/20</span>
    </p>
    <p class="aim">
      {#if aim <= 0}
        Objectif {mark(target)} assuré
      {:else if aim > 20}
        Objectif {mark(target)} hors de portée en un contrôle
      {:else}
        Pour {mark(target)} : <strong>{mark(Math.ceil(aim * 4) / 4)}</strong> au prochain (coef {mark(
          nextCoef
        )})
      {/if}
    </p>
    <ul>
      {#each grades as grade, i (i)}
        <li>
          <button
            type="button"
            aria-label="Retirer {mark(grade.value)}/{grade.outOf}"
            onclick={() => remove(i)}
          >
            {mark(grade.value)}{#if grade.outOf !== 20}<span>/{grade.outOf}</span>{/if}
            {#if grade.coef !== 1}<span>×{mark(grade.coef)}</span>{/if}
            <XIcon class="x" size={10} aria-hidden="true" />
          </button>
        </li>
      {/each}
    </ul>
    <div class="add" data-no-drag>
      <input
        bind:value={draft}
        onkeydown={onEnter}
        placeholder="Note (15 ou 7,5/10)"
        aria-label="Nouvelle note"
      />
      <input
        class="coef"
        bind:value={coef}
        onkeydown={onEnter}
        inputmode="decimal"
        aria-label="Coefficient"
        title="Coefficient"
      />
    </div>
  {/if}
</div>

<style>
  .widget {
    box-sizing: border-box;
    height: 100%;
    padding: clamp(10px, 8cqmin, 20px);
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow: hidden;
  }

  .label {
    font-size: var(--text-12);
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
    color: var(--text-faint);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  p {
    margin: 0;
  }

  .mean {
    font-size: var(--text-display-m);
    font-weight: var(--weight-light);
    letter-spacing: var(--tracking-display);
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }

  .mean.below {
    color: var(--accent-orange);
  }

  .unit {
    margin-left: 4px;
    font-size: var(--text-14);
    letter-spacing: 0;
    color: var(--text-faint);
  }

  .aim {
    font-size: var(--text-12);
    color: var(--text-muted);
  }

  .aim strong {
    font-weight: var(--weight-semibold);
    color: var(--accent);
  }

  ul {
    flex: 1;
    min-height: 0;
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    gap: 6px;
    overflow-y: auto;
  }

  li button {
    display: flex;
    align-items: center;
    gap: 3px;
    height: var(--control-h-chip);
    padding: 0 10px;
    border: 0;
    border-radius: var(--radius-pill);
    background: var(--white-8);
    color: var(--text);
    font: inherit;
    font-size: var(--text-13);
    font-variant-numeric: tabular-nums;
    cursor: pointer;
  }

  li button span {
    font-size: var(--text-11);
    color: var(--text-faint);
  }

  li button :global(.x) {
    display: none;
    color: var(--text-faint);
  }

  li button:hover {
    background: var(--white-12);
  }

  li button:hover :global(.x) {
    display: block;
  }

  .add {
    display: grid;
    grid-template-columns: 1fr 48px;
    gap: 6px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: var(--text-12);
    color: var(--text-muted);
  }

  input {
    box-sizing: border-box;
    min-width: 0;
    min-height: var(--control-h-input);
    padding: 0 10px;
    border: 1px solid var(--line);
    border-radius: var(--radius-input);
    background: var(--white-5);
    color: var(--text);
    font: inherit;
    font-size: var(--text-13);
    outline: 0;
  }

  .coef {
    text-align: center;
  }

  input:focus {
    border-color: var(--border-focus);
  }

  button:focus-visible {
    outline: var(--focus-ring);
    outline-offset: var(--focus-offset);
  }

  /* Petite case : la moyenne seule. */
  @container (max-height: 200px) {
    ul,
    .add {
      display: none;
    }
  }

  @container (max-height: 90px) {
    .aim,
    .label {
      display: none;
    }
  }
</style>
