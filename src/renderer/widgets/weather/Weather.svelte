<script lang="ts">
  // Météo actuelle de la ville choisie, min / max du jour ; carte large : les jours suivants.
  // La ville se règle en mode édition (validée à Entrée ou en quittant le champ).
  import type { WeatherFeed } from '../../../shared/api'
  import { pollWhileVisible } from '../../lib/poll.svelte'
  import type { WidgetProps } from '../types'
  import { describe } from './codes'
  import type { WeatherSettings } from './manifest'

  let { settings, editing, save }: WidgetProps<WeatherSettings> = $props()

  let feed = $state.raw<WeatherFeed | null>()

  // Cache de Photon seulement : relu souvent, ne coûte rien.
  pollWhileVisible(async () => {
    feed = await window.photon.weather(settings.city)
  }, 5_000)

  const today = $derived(feed?.days[0])
  const next = $derived(feed?.days.slice(1, 5) ?? [])
  const now = $derived(feed?.current ? describe(feed.current.code, feed.current.day) : null)
  const deg = (n: number): string => `${Math.round(n)}°`
  const weekday = (date: string): string =>
    new Date(`${date}T12:00`).toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')
</script>

<div class="widget">
  {#if editing || !settings.city}
    <label class="field">
      Ville
      <input
        value={settings.city}
        placeholder="Lyon, Paris…"
        maxlength="80"
        onchange={(event) => save({ ...settings, city: event.currentTarget.value.trim() })}
      />
      {#if !editing}<span class="hint">Entrée pour valider</span>{/if}
    </label>
  {:else if !feed?.current}
    <p class="message">{feed?.error ?? 'Lecture de la météo…'}</p>
  {:else if now}
    <div class="main">
      <now.icon size={44} weight="duotone" color="var(--accent)" aria-hidden="true" />
      <div>
        <p class="temp">{deg(feed.current.temperature)}</p>
        <p class="sub">{now.label}</p>
      </div>
    </div>
    <p class="place">
      {feed.place}
      {#if today}<span>· {deg(today.min)} / {deg(today.max)}</span>{/if}
      {#if feed.error}<span title="Dernière météo connue"> · {feed.error}</span>{/if}
    </p>
    {#if next.length}
      <ul class="days">
        {#each next as day (day.date)}
          {@const d = describe(day.code)}
          <li>
            <span>{weekday(day.date)}</span>
            <d.icon size={20} weight="duotone" aria-label={d.label} />
            <span class="range">{deg(day.min)} {deg(day.max)}</span>
          </li>
        {/each}
      </ul>
    {/if}
  {/if}
</div>

<style>
  .widget {
    box-sizing: border-box;
    height: 100%;
    padding: clamp(12px, 9cqmin, 20px);
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 8px;
  }

  p {
    margin: 0;
  }

  .main {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .temp {
    font-size: clamp(26px, 16cqmin, 44px);
    font-weight: 300;
    line-height: 1;
  }

  .sub,
  .place,
  .message {
    font-size: 13px;
    color: var(--text-muted);
  }

  .place span {
    color: var(--text-faint);
  }

  .message {
    text-align: center;
  }

  .days {
    display: none;
    margin: 4px 0 0;
    padding: 0;
    list-style: none;
    gap: 6px;
  }

  .days li {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--text-muted);
  }

  .range {
    color: var(--text-faint);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  /* Carte large : prévisions des jours suivants. */
  @container (min-width: 420px) and (min-height: 200px) {
    .days {
      display: flex;
    }
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 12px;
    color: var(--text-muted);
  }

  .field input {
    min-height: 32px;
    padding: 0 10px;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: rgb(255 255 255 / 0.05);
    color: var(--text);
    font: inherit;
  }

  .hint {
    color: var(--text-faint);
  }
</style>
