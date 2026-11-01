<script lang="ts">
  // Prochains événements, groupés par jour. Photon lit l'agenda en fond (src/main/calendar.ts) :
  // le widget ne lit que ce cache, fenêtre visible. En édition : champ pour l'adresse iCal.
  import type { CalendarEvent, CalendarFeed } from '../../../shared/api'
  import { pollWhileVisible } from '../../lib/poll.svelte'
  import type { WidgetProps } from '../types'
  import type { CalendarSettings } from './manifest'

  let { settings, editing, save }: WidgetProps<CalendarSettings> = $props()

  // undefined = pas encore lu ; null = adresse refusée (ni https ni webcal).
  let feed = $state.raw<CalendarFeed | null>()
  let now = $state(Date.now())

  // Cache en mémoire seulement : relu souvent pour afficher vite un agenda qu'on vient d'ajouter.
  pollWhileVisible(async () => {
    now = Date.now()
    feed = settings.url ? await window.photon.calendar(settings.url) : undefined
  }, 5_000)

  const DAY_MS = 86_400_000
  function startOfDay(time: number): number {
    const date = new Date(time)
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  }
  const dayFormat = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'short'
  })
  const timeFormat = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })

  function dayLabel(day: number): string {
    const today = startOfDay(now)
    if (day === today) return "Aujourd'hui"
    if (day === startOfDay(today + DAY_MS + 3_600_000)) return 'Demain' // +1 h : passage à l'heure d'été
    return dayFormat.format(day).replace(/^./, (letter) => letter.toUpperCase())
  }

  // Un événement commencé avant aujourd'hui (journée sur plusieurs jours) s'affiche aujourd'hui.
  const groups = $derived.by(() => {
    const today = startOfDay(now)
    const result: { day: number; events: CalendarEvent[] }[] = []
    for (const event of feed?.events ?? []) {
      if (event.end <= now) continue
      const day = Math.max(startOfDay(event.start), today)
      const last = result.at(-1)
      if (last?.day === day) last.events.push(event)
      else result.push({ day, events: [event] })
    }
    return result
  })

  const message = $derived.by(() => {
    if (!settings.url) return 'Ajoute ton agenda en mode édition'
    if (feed === null) return 'Adresse refusée : https:// ou webcal://'
    if (!feed || (feed.updatedAt === null && !feed.error)) return 'Chargement…'
    if (feed.updatedAt === null) return 'Agenda illisible'
    if (groups.length === 0) return 'Rien de prévu sur 14 jours'
    return ''
  })

  const ongoing = (event: CalendarEvent): boolean =>
    !event.allDay && event.start <= now && now < event.end
</script>

<div class="widget">
  <span class="label">Agenda</span>
  {#if editing}
    <!-- data-no-drag : gridstack ne déplace pas la carte quand on clique dans le champ.
         Enregistré à la validation (change), pas à chaque lettre : chaque enregistrement lit l'agenda. -->
    <label class="field" data-no-drag>
      <span>Adresse iCal secrète</span>
      <input
        type="url"
        value={settings.url}
        placeholder="https://calendar.google.com/calendar/ical/…/basic.ics"
        spellcheck="false"
        onchange={(event) => save({ ...settings, url: event.currentTarget.value.trim() })}
      />
      <small>Google Agenda › Paramètres de l'agenda › Adresse secrète au format iCal</small>
    </label>
  {:else if message}
    <p class="message">{message}</p>
  {:else}
    <div class="list">
      {#each groups as group (group.day)}
        <section>
          <h3>{dayLabel(group.day)}</h3>
          <ul>
            {#each group.events as event (event.start + event.title)}
              <li class:now={ongoing(event)}>
                <span class="dot" aria-hidden="true"></span>
                <span class="time">
                  {event.allDay
                    ? 'Journée'
                    : ongoing(event)
                      ? 'En cours'
                      : timeFormat.format(event.start)}
                </span>
                <span class="title" title={event.location || event.title}>{event.title}</span>
              </li>
            {/each}
          </ul>
        </section>
      {/each}
    </div>
  {/if}
</div>

<style>
  .widget {
    box-sizing: border-box;
    height: 100%;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .label {
    font-size: var(--text-12);
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
    color: var(--text-faint);
  }

  .message {
    margin: auto 0;
    font-size: var(--text-13);
    color: var(--text-faint);
  }

  /* Ce qui dépasse est rogné en fondu : jamais de barre de défilement dans une carte. */
  .list {
    flex: 1 1 0;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    gap: 12px;
    mask: linear-gradient(#000 calc(100% - 24px), transparent);
  }

  section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  h3 {
    margin: 0;
    font-size: var(--text-12);
    font-weight: var(--weight-medium);
    color: var(--text-muted);
  }

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  li {
    display: grid;
    grid-template-columns: 6px 4.6em 1fr;
    align-items: center;
    column-gap: 10px;
    font-size: var(--text-13);
    line-height: 18px;
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--accent) 60%, transparent);
  }

  .time {
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Événement en cours : point d'accent lumineux. */
  .now .dot {
    background: var(--accent);
    box-shadow: var(--glow-dot);
  }

  .now .time {
    color: var(--accent);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: var(--text-13);
  }

  .field input {
    min-height: 34px;
    padding: 0 10px;
    border: 1px solid var(--glass-edge);
    border-radius: var(--radius-input);
    background: var(--black-25);
    color: var(--text);
    font: inherit;
    user-select: text;
  }

  .field input:focus-visible {
    outline: var(--focus-ring);
    outline-offset: 0;
  }

  .field small {
    font-size: var(--text-11);
    color: var(--text-faint);
  }
</style>
