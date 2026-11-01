<script lang="ts">
  // Tâches partagées entre profils (ou propres au profil). Entrée ajoute ; cocher range la tâche
  // en bas de la liste.
  import CheckIcon from 'phosphor-svelte/lib/CheckIcon'
  import XIcon from 'phosphor-svelte/lib/XIcon'
  import OwnToggle from '../../lib/OwnToggle.svelte'
  import { profileKey, shared } from '../../lib/shared.svelte'
  import type { WidgetProps } from '../types'
  import type { TodoSettings } from './manifest'

  let { settings, editing, save }: WidgetProps<TodoSettings> = $props()

  interface Task {
    id: string
    text: string
    done: boolean
  }

  const MAX_TASKS = 200
  const MAX_TEXT = 300

  const parse = (raw: unknown): { tasks: Task[] } => {
    const items = (raw as { tasks?: unknown } | null)?.tasks
    const tasks = Array.isArray(items)
      ? items
          .filter(
            (t): t is Task =>
              typeof t?.id === 'string' && typeof t.text === 'string' && typeof t.done === 'boolean'
          )
          .slice(0, MAX_TASKS)
          .map(({ id, text, done }) => ({ id, text: text.slice(0, MAX_TEXT), done }))
      : []
    return { tasks }
  }
  const todo = $derived(shared(profileKey('todo', settings.own === true), parse))

  let draft = $state('')

  // À faire d'abord, faites ensuite (ordre d'ajout gardé dans chaque groupe).
  const sorted = $derived([
    ...todo.value.tasks.filter((t) => !t.done),
    ...todo.value.tasks.filter((t) => t.done)
  ])
  const left = $derived(todo.value.tasks.filter((t) => !t.done).length)

  function add(): void {
    const text = draft.trim()
    if (!text || todo.value.tasks.length >= MAX_TASKS) return
    todo.value.tasks.push({ id: crypto.randomUUID(), text, done: false })
    draft = ''
    todo.save()
  }

  function toggle(task: Task): void {
    task.done = !task.done
    todo.save()
  }

  function remove(id: string): void {
    todo.value.tasks = todo.value.tasks.filter((t) => t.id !== id)
    todo.save()
  }
</script>

<div class="widget">
  <div class="head">
    <span class="label">To-do</span>
    {#if editing}
      <OwnToggle checked={settings.own === true} onchange={(own) => save({ ...settings, own })} />
    {:else if todo.value.tasks.length}<span class="count">{left} à faire</span>{/if}
  </div>
  <ul>
    {#each sorted as task (task.id)}
      <li class:done={task.done}>
        <button
          type="button"
          class="check"
          role="checkbox"
          aria-checked={task.done}
          aria-label={task.text}
          onclick={() => toggle(task)}
        >
          {#if task.done}<CheckIcon size={12} weight="bold" aria-hidden="true" />{/if}
        </button>
        <span class="text">{task.text}</span>
        <button
          type="button"
          class="remove"
          aria-label="Supprimer « {task.text} »"
          onclick={() => remove(task.id)}
        >
          <XIcon size={12} aria-hidden="true" />
        </button>
      </li>
    {/each}
  </ul>
  <input
    bind:value={draft}
    onkeydown={(event) => {
      if (event.key === 'Enter') add()
    }}
    disabled={!todo.ready}
    maxlength={MAX_TEXT}
    placeholder="Ajouter une tâche…"
    aria-label="Nouvelle tâche"
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
    font-size: 12px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-faint);
  }

  .count {
    font-size: 12px;
    color: var(--text-faint);
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
    min-height: 30px;
    font-size: 14px;
  }

  .text {
    flex: 1;
    min-width: 0;
    overflow-wrap: anywhere;
    transition: opacity 200ms var(--ease-out);
  }

  .done .text {
    opacity: 0.45;
    text-decoration: line-through;
  }

  button {
    flex: none;
    display: grid;
    place-items: center;
    padding: 0;
    border: 0;
    cursor: pointer;
  }

  .check {
    width: 18px;
    height: 18px;
    border: 1.5px solid var(--text-faint);
    border-radius: 6px;
    background: none;
    color: var(--on-accent);
  }

  .done .check {
    border-color: var(--accent);
    background: var(--accent);
  }

  .remove {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: none;
    color: var(--text-faint);
    opacity: 0;
  }

  li:hover .remove,
  .remove:focus-visible {
    opacity: 1;
  }

  .remove:hover {
    color: var(--text);
    background: rgb(255 255 255 / 0.08);
  }

  input {
    min-height: 32px;
    padding: 0 10px;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: rgb(255 255 255 / 0.05);
    color: var(--text);
    font: inherit;
    font-size: 13px;
    outline: 0;
  }

  input:focus {
    border-color: color-mix(in srgb, var(--accent) 50%, transparent);
  }

  button:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
</style>
