<script lang="ts">
  // Grand nombre de jours qui défile, titre et date dessous. Date passée : « il y a N jours ».
  // Réglages (nom, date) en mode édition, ou tant qu'aucune date n'est choisie.
  import { pollWhileVisible } from '../../lib/poll.svelte'
  import RollingNumber from '../../lib/RollingNumber.svelte'
  import type { WidgetProps } from '../types'
  import { daysUntil } from '../../../shared/days'
  import type { CountdownSettings } from './manifest'

  let { settings, editing, save }: WidgetProps<CountdownSettings> = $props()

  // Relu chaque minute : le nombre change à minuit sans rouvrir Photon.
  let now = $state(new Date())
  pollWhileVisible(() => {
    now = new Date()
  }, 60_000)

  const days = $derived(daysUntil(settings.date, now))
  const dateFormat = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
  const dateLabel = $derived(
    days === null ? '' : dateFormat.format(new Date(`${settings.date}T00:00`))
  )
  const unit = (n: number): string => (Math.abs(n) > 1 ? 'jours' : 'jour')
</script>

<div class="widget" class:editing>
  {#if editing || days === null}
    {#if !editing}<p class="hint">Choisis une date en mode édition</p>{/if}
    <label class="field" data-no-drag>
      Nom
      <input
        value={settings.title}
        placeholder="Déclaration URSSAF…"
        maxlength="60"
        onchange={(event) => save({ ...settings, title: event.currentTarget.value.trim() })}
      />
    </label>
    <label class="field" data-no-drag>
      Date
      <input
        type="date"
        value={settings.date}
        onchange={(event) => save({ ...settings, date: event.currentTarget.value })}
      />
    </label>
  {:else}
    {#if settings.title}<span class="label" title={settings.title}>{settings.title}</span>{/if}
    {#if days === 0}
      <p class="today">Aujourd'hui</p>
    {:else}
      <p class="count" class:past={days < 0}>
        {#if days < 0}<span class="unit">il y a</span>{/if}
        <span class="number"><RollingNumber value={String(Math.abs(days))} /></span>
        <span class="unit">{unit(days)}</span>
      </p>
    {/if}
    <p class="date">{dateLabel}</p>
  {/if}
</div>

<style>
  .widget {
    box-sizing: border-box;
    height: 100%;
    padding: clamp(10px, 8cqmin, 20px);
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 6px;
    overflow: hidden;
  }

  /* Mode édition : la case grandit avec ses réglages, la carte les fait défiler (WidgetFrame). */
  .widget.editing {
    height: auto;
    min-height: 100%;
    justify-content: flex-start;
    gap: 10px;
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

  .count {
    display: flex;
    align-items: baseline;
    gap: 8px;
    white-space: nowrap;
  }

  /* Le nombre suit la case : petit en 1 × 1, grand en 3 × 2. */
  .number {
    font-size: clamp(var(--text-display-s), 40cqmin, var(--text-display-xl));
    font-weight: var(--weight-light);
    letter-spacing: var(--tracking-display);
    line-height: 1;
  }

  .past .number {
    color: var(--text-muted);
  }

  .unit {
    font-size: var(--text-14);
    color: var(--text-muted);
  }

  .today {
    font-size: var(--text-display-s);
    font-weight: var(--weight-light);
    letter-spacing: var(--tracking-title);
    color: var(--accent);
  }

  .date {
    font-size: var(--text-13);
    color: var(--text-faint);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: var(--text-12);
    color: var(--text-muted);
  }

  .field input {
    min-height: var(--control-h-input);
    padding: 0 10px;
    border: 1px solid var(--line);
    border-radius: var(--radius-input);
    background: var(--white-5);
    color: var(--text);
    font: inherit;
    color-scheme: dark; /* calendrier natif sombre */
  }

  .field input:focus-visible {
    outline: var(--focus-ring);
    outline-offset: var(--focus-offset);
  }

  .hint {
    display: none;
    margin: 0;
    font-size: var(--text-12);
    color: var(--text-faint);
  }

  /* Case trop petite pour les champs, sans date : une phrase à la place (comme l'Agenda). */
  @container (max-width: 220px) {
    .widget:not(.editing) .hint {
      display: block;
    }

    .widget:not(.editing) .field {
      display: none;
    }
  }

  /* Petite case : nombre et unité seulement ; en édition, les deux champs côte à côte s'ils
     tiennent en largeur (sinon l'un sous l'autre, la carte défile). */
  @container (max-height: 120px) {
    .date {
      display: none;
    }
  }

  @container (max-height: 120px) and (min-width: 221px) {
    .widget.editing {
      flex-direction: row;
      align-items: flex-end;
    }

    .widget.editing .field {
      flex: 1;
      min-width: 0;
    }
  }
</style>
