<script lang="ts">
  // Un projet par ligne : bouton lecture / arrêt, temps du jour, temps de la semaine. Un seul
  // chrono à la fois. Mode édition : supprimer un projet (et son historique).
  import PlayIcon from 'phosphor-svelte/lib/PlayIcon'
  import StopIcon from 'phosphor-svelte/lib/StopIcon'
  import XIcon from 'phosphor-svelte/lib/XIcon'
  import { pollWhileVisible } from '../../lib/poll.svelte'
  import { shared } from '../../lib/shared.svelte'
  import type { WidgetProps } from '../types'
  import type { TimetrackSettings } from './manifest'
  import {
    duration,
    parseTime,
    spent,
    startOfDay,
    startOfWeek,
    toggle
  } from '../../../shared/timetrack'

  let { editing }: WidgetProps<TimetrackSettings> = $props()

  const time = shared('timetrack', parseTime)
  let now = $state(Date.now())
  let draft = $state('')

  // L'affichage avance chaque seconde seulement fenêtre visible.
  pollWhileVisible(() => (now = Date.now()), 1_000)

  const today = $derived(startOfDay(now))
  const week = $derived(startOfWeek(now))
  const total = $derived(
    time.value.projects.reduce((sum, p) => sum + spent(time.value, p.id, today, now), 0)
  )

  function run(project: string): void {
    now = Date.now()
    toggle(time.value, project, now)
    time.save()
  }

  function add(): void {
    const name = draft.trim().slice(0, 60)
    if (!name || time.value.projects.length >= 30) return
    time.value.projects.push({ id: crypto.randomUUID(), name })
    draft = ''
    time.save()
  }

  function remove(id: string): void {
    const v = time.value
    v.projects = v.projects.filter((p) => p.id !== id)
    v.entries = v.entries.filter((e) => e.project !== id)
    if (v.running?.project === id) v.running = null
    time.save()
  }
</script>

<div class="widget">
  <div class="head">
    <span class="label">Temps</span>
    {#if total}<span class="total">{duration(total)} aujourd'hui</span>{/if}
  </div>
  <ul>
    {#each time.value.projects as project (project.id)}
      {@const active = time.value.running?.project === project.id}
      <li class:active>
        <button
          type="button"
          class="run"
          aria-label={active ? `Arrêter ${project.name}` : `Démarrer ${project.name}`}
          onclick={() => run(project.id)}
        >
          {#if active}<StopIcon size={12} weight="fill" />{:else}<PlayIcon
              size={12}
              weight="fill"
            />{/if}
        </button>
        <span class="name">{project.name}</span>
        <span class="day">{duration(spent(time.value, project.id, today, now))}</span>
        <span class="week" title="Cette semaine"
          >{duration(spent(time.value, project.id, week, now))}</span
        >
        {#if editing}
          <button
            type="button"
            class="remove"
            aria-label="Supprimer {project.name} et son historique"
            onclick={() => remove(project.id)}
          >
            <XIcon size={12} />
          </button>
        {/if}
      </li>
    {/each}
  </ul>
  <input
    bind:value={draft}
    onkeydown={(event) => {
      if (event.key === 'Enter') add()
    }}
    disabled={!time.ready}
    maxlength="60"
    placeholder="Nouveau client ou projet…"
    aria-label="Nouveau projet"
  />
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
  }

  .label {
    font-size: var(--text-12);
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
    color: var(--text-faint);
  }

  .total {
    font-size: var(--text-12);
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }

  ul {
    flex: 1;
    min-height: 0;
    margin: 0;
    padding: 0;
    list-style: none;
    overflow-y: auto;
  }

  li {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 32px;
    font-size: var(--text-14);
  }

  .name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .day,
  .week {
    font-variant-numeric: tabular-nums;
  }

  .day {
    color: var(--text-muted);
  }

  .week {
    min-width: 4.5em;
    text-align: right;
    font-size: var(--text-12);
    color: var(--text-faint);
  }

  .active .name,
  .active .day {
    color: var(--accent);
  }

  button {
    flex: none;
    display: grid;
    place-items: center;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: none;
    color: var(--text-muted);
    cursor: pointer;
  }

  .run {
    width: 26px;
    height: 26px;
    background: var(--white-6);
  }

  .run:hover {
    color: var(--text);
    background: var(--white-12);
  }

  .active .run {
    color: var(--on-accent);
    background: var(--accent);
  }

  .remove {
    width: 22px;
    height: 22px;
    color: var(--text-faint);
  }

  .remove:hover {
    color: var(--text);
    background: var(--white-8);
  }

  input {
    min-height: 32px;
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
</style>
