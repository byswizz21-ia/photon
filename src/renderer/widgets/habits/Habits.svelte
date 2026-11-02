<script lang="ts">
  // Une ligne par habitude : nom, série en cours, les 7 derniers jours (aujourd'hui à droite).
  // Un clic sur un jour le coche ou le décoche (oubli de la veille rattrapable).
  import CheckIcon from 'phosphor-svelte/lib/CheckIcon'
  import FlameIcon from 'phosphor-svelte/lib/FlameIcon'
  import XIcon from 'phosphor-svelte/lib/XIcon'
  import OwnToggle from '../../lib/OwnToggle.svelte'
  import { dayKey } from '../../../shared/day'
  import { pollWhileVisible } from '../../lib/poll.svelte'
  import { profileKey, shared } from '../../lib/shared.svelte'
  import type { WidgetProps } from '../types'
  import { canAdd, parseHabits, streak, toggleDay, type Habit } from './habits'
  import type { HabitsSettings } from './manifest'

  let { settings, editing, save }: WidgetProps<HabitsSettings> = $props()

  const data = $derived(shared(profileKey('habits', settings.own === true), parseHabits))

  // Relu chaque minute : « aujourd'hui » avance à minuit sans rouvrir Photon.
  let now = $state(new Date())
  pollWhileVisible(() => (now = new Date()), 60_000)

  const letter = new Intl.DateTimeFormat('fr-FR', { weekday: 'narrow' })
  const long = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  const week = $derived(
    [-6, -5, -4, -3, -2, -1, 0].map((offset) => {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset)
      return { key: dayKey(now, offset), letter: letter.format(date), label: long.format(date) }
    })
  )
  const today = $derived(dayKey(now))
  const doneToday = $derived(data.value.habits.filter((h) => h.days.includes(today)).length)

  let draft = $state('')

  function add(): void {
    const name = draft.trim().slice(0, 60)
    if (!name || !canAdd(data.value.habits)) return
    data.value.habits.push({ id: crypto.randomUUID(), name, days: [] })
    draft = ''
    data.save()
  }

  function toggle(habit: Habit, day: string): void {
    toggleDay(habit, day)
    data.save()
  }

  function remove(id: string): void {
    data.value.habits = data.value.habits.filter((h) => h.id !== id)
    data.save()
  }
</script>

<div class="widget" class:editing>
  <div class="head">
    <span class="label">Habitudes</span>
    {#if editing}
      <OwnToggle checked={settings.own === true} onchange={(own) => save({ ...settings, own })} />
    {:else if data.value.habits.length}
      <span class="count">{doneToday} / {data.value.habits.length} aujourd'hui</span>
    {/if}
  </div>
  {#if data.value.habits.length}
    <div class="row days" aria-hidden="true">
      {#if editing}<span></span>{/if}
      <span></span>
      <span></span>
      {#each week as day, i (day.key)}<span class:today={day.key === today} class:old={i < 4}
          >{day.letter}</span
        >{/each}
    </div>
  {/if}
  <ul>
    {#each data.value.habits as habit (habit.id)}
      {@const series = streak(habit.days, now)}
      <li class="row">
        {#if editing}
          <button
            type="button"
            class="remove"
            aria-label="Supprimer « {habit.name} » et son historique"
            onclick={() => remove(habit.id)}
          >
            <XIcon size={12} aria-hidden="true" />
          </button>
        {/if}
        <span class="name" title={habit.name}>{habit.name}</span>
        <span class="streak" class:on={series > 0} title="{series} jour(s) d'affilée">
          <FlameIcon size={13} weight={series > 0 ? 'fill' : 'regular'} aria-hidden="true" />
          {series}
        </span>
        {#each week as day, i (day.key)}
          {@const done = habit.days.includes(day.key)}
          <button
            type="button"
            class="day"
            class:done
            class:today={day.key === today}
            class:old={i < 4}
            role="checkbox"
            aria-checked={done}
            aria-label="{habit.name}, {day.label}"
            onclick={() => toggle(habit, day.key)}
          >
            {#if done}<CheckIcon size={10} weight="bold" aria-hidden="true" />{/if}
          </button>
        {/each}
      </li>
    {/each}
  </ul>
  {#if canAdd(data.value.habits)}
    <input
      bind:value={draft}
      onkeydown={(event) => {
        if (event.key === 'Enter') add()
      }}
      disabled={!data.ready}
      maxlength="60"
      placeholder="Nouvelle habitude (sport, lecture…)"
      aria-label="Nouvelle habitude"
    />
  {/if}
</div>

<style>
  .widget {
    box-sizing: border-box;
    height: 100%;
    padding: clamp(12px, 9cqmin, 20px);
    display: flex;
    flex-direction: column;
    gap: 8px;
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
    color: var(--text-faint);
  }

  ul {
    flex: 1;
    min-height: 0;
    margin: 0;
    padding: 0;
    list-style: none;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  /* Nom, série, puis 7 cases de même largeur alignées avec les lettres des jours. */
  .row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 36px repeat(7, 22px);
    align-items: center;
    column-gap: 4px;
  }

  .editing .row {
    grid-template-columns: 22px minmax(0, 1fr) 36px repeat(7, 22px);
  }

  .days span {
    text-align: center;
    font-size: var(--text-11);
    color: var(--text-faint);
    text-transform: uppercase;
  }

  .days .today {
    color: var(--accent);
  }

  .name {
    font-size: var(--text-14);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .streak {
    display: flex;
    align-items: center;
    gap: 3px;
    font-size: var(--text-12);
    color: var(--text-faint);
    font-variant-numeric: tabular-nums;
  }

  .streak.on {
    color: var(--accent-orange);
  }

  button {
    display: grid;
    place-items: center;
    padding: 0;
    border: 0;
    cursor: pointer;
  }

  .day {
    width: 20px;
    height: 20px;
    justify-self: center;
    border: 1.5px solid var(--white-15);
    border-radius: 50%;
    background: none;
    color: var(--on-accent);
    transition: transform var(--dur-press) var(--ease-out);
  }

  .day:active {
    transform: scale(var(--press-scale));
  }

  .day.today {
    border-color: var(--text-faint);
  }

  .day.done {
    border-color: var(--accent);
    background: var(--accent);
  }

  .remove {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: none;
    color: var(--text-faint);
  }

  .remove:hover {
    color: var(--text);
    background: var(--white-8);
  }

  input {
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

  input:focus {
    border-color: var(--border-focus);
  }

  button:focus-visible {
    outline: var(--focus-ring);
    outline-offset: var(--focus-offset);
  }

  /* Case étroite : seulement les 3 derniers jours. */
  @container (max-width: 300px) {
    .row {
      grid-template-columns: minmax(0, 1fr) 36px repeat(3, 22px);
    }
    .editing .row {
      grid-template-columns: 22px minmax(0, 1fr) 36px repeat(3, 22px);
    }
    .old {
      display: none;
    }
  }
</style>
