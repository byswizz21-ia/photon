<script lang="ts">
  // Anniversaires du plus proche au plus lointain : nom, date, « dans N jours », âge atteint.
  // Ajout en bas (nom + « 14/03 » ou « 14/03/1999 ») ; suppression en mode édition.
  import CakeIcon from 'phosphor-svelte/lib/CakeIcon'
  import XIcon from 'phosphor-svelte/lib/XIcon'
  import { parseBirthdays, parseDayInput, upcoming } from '../../../shared/birthdays'
  import { pollWhileVisible } from '../../lib/poll.svelte'
  import { shared } from '../../lib/shared.svelte'
  import type { WidgetProps } from '../types'
  import type { BirthdaysSettings } from './manifest'

  let { editing }: WidgetProps<BirthdaysSettings> = $props()

  const data = shared('birthdays', parseBirthdays)

  // Relu chaque minute : « aujourd'hui » avance à minuit sans rouvrir Photon.
  let now = $state(new Date())
  pollWhileVisible(() => (now = new Date()), 60_000)

  const list = $derived(upcoming(data.value.people, now))
  const short = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })
  const when = (days: number): string =>
    days === 0 ? "Aujourd'hui" : days === 1 ? 'Demain' : `Dans ${days} j`

  let name = $state('')
  let date = $state('')
  const parsed = $derived(parseDayInput(date, now))

  function add(): void {
    const clean = name.trim().slice(0, 60)
    if (!clean || !parsed) return
    data.value.people.push({ id: crypto.randomUUID(), name: clean, ...parsed })
    name = ''
    date = ''
    data.save()
  }

  function remove(id: string): void {
    data.value.people = data.value.people.filter((p) => p.id !== id)
    data.save()
  }

  const onEnter = (event: KeyboardEvent): void => {
    if (event.key === 'Enter') add()
  }
</script>

<div class="w-body">
  <div class="w-head">
    <span class="w-label">Anniversaires</span>
    {#if list[0]?.days === 0}<span class="today">C'est aujourd'hui !</span>{/if}
  </div>

  {#if list.length}
    <ul class="w-list">
      {#each list as person (person.id)}
        <li class="person" class:soon={person.days <= 1}>
          {#if editing}
            <button
              type="button"
              class="w-icon"
              aria-label="Retirer {person.name}"
              onclick={() => remove(person.id)}><XIcon size={12} aria-hidden="true" /></button
            >
          {:else if person.days === 0}
            <CakeIcon size={18} weight="fill" color="var(--accent)" aria-hidden="true" />
          {/if}
          <span class="name" title={person.name}>{person.name}</span>
          <span class="meta">
            {short.format(new Date(`${person.date}T00:00`)).replace('.', '')}
            {#if person.age !== null}· {person.age} ans{/if}
          </span>
          <span class="when">{when(person.days)}</span>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="w-message">Ajoute les anniversaires à ne pas oublier.</p>
  {/if}

  <div class="w-row add" data-no-drag>
    <input
      class="w-input grow"
      bind:value={name}
      onkeydown={onEnter}
      disabled={!data.ready}
      maxlength="60"
      placeholder="Prénom"
      aria-label="Prénom"
    />
    <input
      class="w-input date"
      class:bad={date.trim() !== '' && !parsed}
      bind:value={date}
      onkeydown={onEnter}
      disabled={!data.ready}
      maxlength="10"
      placeholder="jj/mm(/aaaa)"
      aria-label="Date d'anniversaire, jj/mm ou jj/mm/aaaa"
    />
  </div>
</div>

<style>
  .today {
    font-size: var(--text-12);
    color: var(--accent);
  }

  .person {
    min-height: 30px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: var(--text-14);
  }

  .name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .meta {
    font-size: var(--text-12);
    color: var(--text-faint);
    white-space: nowrap;
  }

  .when {
    min-width: 64px;
    text-align: right;
    font-size: var(--text-12);
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .soon .when {
    color: var(--accent);
  }

  .grow {
    flex: 1;
  }

  .date {
    width: 104px;
  }

  .bad {
    border-color: var(--danger-border);
  }

  @container (max-width: 260px) {
    .meta {
      display: none;
    }
  }
</style>
