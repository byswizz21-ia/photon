<script lang="ts">
  // Films, Séries ou Jeux en puces, puis les prochaines sorties (affiche, titre, date, « dans
  // N j »). Clic : la fiche sur TMDB ou Steam. Cache de Photon relu toutes les 60 s.
  // Films et séries demandent une clé TMDB gratuite (mode édition).
  import type { Feed, Release, ReleaseKind } from '../../../shared/api'
  import { daysUntil } from '../../../shared/days'
  import { pollWhileVisible } from '../../lib/poll.svelte'
  import type { WidgetProps } from '../types'
  import type { ReleasesSettings } from './manifest'

  let { settings, editing, save }: WidgetProps<ReleasesSettings> = $props()

  const KINDS: [ReleaseKind, string][] = [
    ['movie', 'Films'],
    ['tv', 'Séries'],
    ['game', 'Jeux']
  ]
  const TMDB_SIGNUP = 'https://www.themoviedb.org/settings/api'

  let feed = $state.raw<Feed<Release> | null | undefined>()
  let now = $state(new Date())
  pollWhileVisible(async () => {
    feed = await window.photon.releases(settings)
    now = new Date()
  }, 60_000)

  const needsKey = $derived(settings.kind !== 'game' && !settings.tmdbKey)
  const long = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  })

  // « 2026-11-12 » → « jeu. 12 nov. · dans 9 j » ; texte libre de Steam (« 2027 ») tel quel.
  function when(date: string): string {
    const days = daysUntil(date, now)
    if (days === null) return date
    const label = long.format(new Date(`${date}T00:00`))
    if (days <= 0) return `${label} · sorti`
    return days === 1 ? `${label} · demain` : `${label} · dans ${days} j`
  }
</script>

<div class="w-body">
  <div class="w-head">
    <span class="w-label">Sorties</span>
    {#if feed?.error}<span class="w-hint">{feed.error}</span>{/if}
  </div>

  <div class="w-chips" role="radiogroup" aria-label="Type de sorties">
    {#each KINDS as [kind, label] (kind)}
      <button
        type="button"
        class="w-chip"
        class:selected={settings.kind === kind}
        role="radio"
        aria-checked={settings.kind === kind}
        onclick={() => save({ ...settings, kind })}>{label}</button
      >
    {/each}
  </div>

  {#if editing || needsKey}
    <label class="w-field" data-no-drag>
      Clé TMDB (films et séries)
      <input
        class="w-input"
        type="password"
        value={settings.tmdbKey}
        autocomplete="off"
        placeholder="Clé d'API (v3) ou jeton (v4)"
        onchange={(e) => save({ ...settings, tmdbKey: e.currentTarget.value.trim() })}
      />
    </label>
    <p class="w-hint">
      Gratuite :
      <button type="button" class="link" onclick={() => window.photon.openUrl(TMDB_SIGNUP)}
        >themoviedb.org › Réglages › API</button
      >
    </p>
  {/if}

  {#if !needsKey}
    {#if !feed || (feed.updatedAt === null && !feed.error)}
      <p class="w-message">Lecture des sorties…</p>
    {:else if !feed.items.length}
      <p class="w-message">{feed.error ?? 'Rien d’annoncé pour le moment.'}</p>
    {:else}
      <ul class="w-list">
        {#each feed.items as r (r.id)}
          <li>
            <button type="button" class="release" onclick={() => window.photon.openUrl(r.url)}>
              {#if r.image}<img class:wide={settings.kind === 'game'} src={r.image} alt="" />{/if}
              <span class="info">
                <span class="title">{r.title}</span>
                <span class="date">{when(r.date)}</span>
              </span>
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  {/if}
</div>

<style>
  .release {
    width: 100%;
    min-height: 44px;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 4px;
    border: 0;
    border-radius: var(--radius-row);
    background: none;
    color: var(--text);
    text-align: left;
    cursor: pointer;
  }

  .release:hover {
    background: var(--surface-hover);
  }

  img {
    flex: none;
    width: 32px;
    height: 48px;
    border-radius: var(--radius-check);
    object-fit: cover;
    background: var(--white-5);
  }

  img.wide {
    width: 80px;
    height: 30px;
  }

  .info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .title {
    font-size: var(--text-14);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .date {
    font-size: var(--text-12);
    color: var(--text-faint);
  }

  .link {
    padding: 0;
    border: 0;
    background: none;
    color: var(--accent);
    font-size: inherit;
    cursor: pointer;
  }

  @container (max-width: 280px) {
    img {
      display: none;
    }
  }
</style>
