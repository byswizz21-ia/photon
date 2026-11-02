<script lang="ts">
  // Une ligne par férié : nom, date, jours restants. Un mardi ou un jeudi : pont possible.
  // Le premier est mis en avant ; en petite case, seul lui reste visible.
  import { pollWhileVisible } from '../../lib/poll.svelte'
  import type { WidgetProps } from '../types'
  import { upcoming } from './holidays'
  import type { HolidaysSettings } from './manifest'

  let { settings, editing, save }: WidgetProps<HolidaysSettings> = $props()

  // Relu chaque minute : la liste avance à minuit sans rouvrir Photon.
  let now = $state(new Date())
  pollWhileVisible(() => (now = new Date()), 60_000)

  const list = $derived(upcoming(now, 8, settings.alsace))
  const dateFormat = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  })
  const left = (days: number): string =>
    days === 0 ? "aujourd'hui" : days === 1 ? 'demain' : `${days} j`
</script>

<div class="widget">
  <div class="head">
    <span class="label">Jours fériés</span>
    {#if editing}
      <label class="option" data-no-drag>
        <input
          type="checkbox"
          checked={settings.alsace}
          onchange={(event) => save({ ...settings, alsace: event.currentTarget.checked })}
        />
        Alsace-Moselle
      </label>
    {/if}
  </div>
  <ul>
    {#each list as holiday (holiday.date.getTime())}
      <li class:today={holiday.days === 0}>
        <span class="name">{holiday.name}</span>
        <span class="left">{left(holiday.days)}</span>
        <span class="date">
          {dateFormat.format(holiday.date)}
          {#if holiday.bridge}<span class="bridge">pont le {holiday.bridge}</span>{/if}
          {#if holiday.weekend}<span class="weekend">week-end</span>{/if}
        </span>
      </li>
    {/each}
  </ul>
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
    white-space: nowrap;
  }

  .option {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: var(--text-12);
    color: var(--text-muted);
    cursor: pointer;
  }

  .option input {
    margin: 0;
    accent-color: var(--accent);
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
    gap: 8px;
  }

  li {
    display: grid;
    grid-template-columns: 1fr auto;
    column-gap: 8px;
  }

  .name {
    font-size: var(--text-14);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .left {
    font-size: var(--text-13);
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .date {
    grid-column: 1 / -1;
    font-size: var(--text-12);
    color: var(--text-faint);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .bridge {
    margin-left: 6px;
    color: var(--accent);
  }

  .weekend {
    margin-left: 6px;
  }

  /* Le prochain férié, en avant. */
  li:first-child .name {
    font-size: var(--text-15);
    font-weight: var(--weight-medium);
  }

  li:first-child .left,
  .today .left {
    color: var(--accent);
  }

  /* Petite case (1 rang) : seul le prochain reste. */
  @container (max-height: 90px) {
    li:not(:first-child) {
      display: none;
    }
  }
</style>
