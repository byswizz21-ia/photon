<script lang="ts">
  // Design « Aujourd'hui » (4×3) : un clic sur le rond coche l'habitude du jour ; la barre du haut
  // se remplit, chaque ligne montre sa série et ses 7 derniers jours en points.
  import CheckIcon from 'phosphor-svelte/lib/CheckIcon'
  import FlameIcon from 'phosphor-svelte/lib/FlameIcon'
  import { dayKey } from '../../../shared/day'
  import { streak, type Habit } from './habits'

  let {
    habits,
    now,
    ontoggle
  }: { habits: Habit[]; now: Date; ontoggle(habit: Habit, day: string): void } = $props()

  const today = $derived(dayKey(now))
  const week = $derived([-6, -5, -4, -3, -2, -1, 0].map((offset) => dayKey(now, offset)))
  const done = $derived(habits.filter((h) => h.days.includes(today)).length)
  const all = $derived(habits.length > 0 && done === habits.length)
</script>

<div class="widget">
  <div class="head">
    <span class="label">Habitudes</span>
    {#if habits.length}
      <span class="count" class:all>
        {all ? 'Tout est fait pour aujourd’hui' : `${done} sur ${habits.length}`}
      </span>
    {/if}
  </div>
  {#if habits.length}
    <div class="segs" aria-hidden="true">
      {#each habits as habit, i (habit.id)}<span class:on={i < done}></span>{/each}
    </div>
    <ul>
      {#each habits as habit (habit.id)}
        {@const on = habit.days.includes(today)}
        {@const series = streak(habit.days, now)}
        <li>
          <button
            type="button"
            class="check"
            class:on
            role="checkbox"
            aria-checked={on}
            aria-label={habit.name}
            onclick={() => ontoggle(habit, today)}
          >
            {#if on}<CheckIcon size={14} weight="bold" />{/if}
          </button>
          <div class="names">
            <span class="name" title={habit.name}>{habit.name}</span>
            <span class="streak" class:lit={series > 0}>
              <FlameIcon size={12} weight={series > 0 ? 'fill' : 'regular'} aria-hidden="true" />
              {series > 0 ? `${series} j d'affilée` : 'Pas de série'}
            </span>
          </div>
          <div class="dots" aria-hidden="true">
            {#each week as day (day)}
              <span class:done={habit.days.includes(day)} class:today={day === today}></span>
            {/each}
          </div>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="empty">Ajoute tes habitudes en mode édition.</p>
  {/if}
</div>

<style>
  .widget {
    box-sizing: border-box;
    height: 100%;
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
  }

  .label {
    font-size: var(--text-12);
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
    color: var(--text-faint);
  }

  .count {
    font-size: var(--text-12);
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }

  .count.all {
    color: var(--accent);
  }

  .segs {
    display: flex;
    gap: 4px;
  }

  .segs span {
    flex: 1;
    height: 4px;
    border-radius: 2px;
    background: var(--white-8);
  }

  .segs .on {
    background: var(--accent);
    box-shadow: var(--glow-bar);
  }

  ul {
    flex: 1;
    min-height: 0;
    margin: 0;
    padding: 0;
    list-style: none;
    overflow: hidden auto;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  li {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 3px 8px;
    margin: 0 -8px;
    border-radius: var(--radius-row);
  }

  li:hover {
    background: var(--white-5);
  }

  .check {
    flex: none;
    box-sizing: border-box;
    width: 28px;
    height: 28px;
    padding: 0;
    display: grid;
    place-items: center;
    border-radius: 50%;
    border: 1.5px solid var(--white-15);
    background: transparent;
    color: var(--on-accent);
    cursor: pointer;
    transition: transform var(--dur-spring) var(--ease-spring);
  }

  .check:active {
    transform: scale(0.9);
    transition-duration: var(--dur-press);
  }

  .check.on {
    border-color: var(--accent);
    background: var(--accent);
    box-shadow: 0 0 14px -2px var(--accent);
  }

  .check:focus-visible {
    outline: var(--focus-ring);
    outline-offset: var(--focus-offset);
  }

  .names {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
    line-height: 1.2;
  }

  .name {
    font-size: var(--text-14);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .streak {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: var(--text-12);
    color: var(--text-faint);
  }

  .streak.lit {
    color: var(--accent-orange);
  }

  .dots {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .dots span {
    box-sizing: border-box;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--white-12);
  }

  .dots .done {
    background: color-mix(in srgb, var(--accent) 65%, transparent);
  }

  .dots .today {
    width: 9px;
    height: 9px;
    background: none;
    border: 1.5px solid var(--text-faint);
  }

  .dots .today.done {
    border: 0;
    background: var(--accent);
    box-shadow: var(--glow-dot);
  }

  .empty {
    margin: auto 0;
    font-size: var(--text-13);
    color: var(--text-faint);
  }
</style>
