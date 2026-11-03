<script lang="ts">
  // Lives en cours, du plus regardé au moins regardé : avatar (aperçu du live en grand), pseudo,
  // jeu, titre, spectateurs, durée. Cache de Photon relu toutes les 20 s : aucun appel réseau ici.
  // Mode édition : chaînes en plus et compte Twitch.
  import type { Feed, TwitchStream } from '../../../shared/api'
  import { pollWhileVisible } from '../../lib/poll.svelte'
  import type { WidgetProps } from '../types'
  import { duration, viewers } from './live'
  import type { TwitchSettings } from './manifest'

  let { settings, editing, save }: WidgetProps<TwitchSettings> = $props()

  let feed = $state.raw<Feed<TwitchStream> | undefined>()
  let signedIn = $state(false)
  let now = $state(Date.now())
  pollWhileVisible(async () => {
    ;({ feed, signedIn } = await window.photon.twitch(settings))
    now = Date.now()
  }, 20_000)

  const lives = $derived(feed?.items ?? [])
  const ready = $derived(signedIn || !!settings.channels.trim())

  function logout(): void {
    void window.photon.twitchLogout().then(() => (signedIn = false))
  }
</script>

<div class="w-body">
  <div class="w-head">
    <span class="w-label">Twitch</span>
    {#if feed?.error}
      <span class="w-hint">{feed.error}</span>
    {:else if ready && feed?.updatedAt}
      <span class="w-hint">{lives.length} en live</span>
    {/if}
  </div>

  {#if editing}
    <div class="edit" data-no-drag>
      <label class="w-field">
        Chaînes en plus de tes suivis
        <textarea
          class="w-input"
          value={settings.channels}
          placeholder="zerator, kamet0, squeezie"
          maxlength="1500"
          rows="3"
          onchange={(event) => save({ ...settings, channels: event.currentTarget.value.trim() })}
        ></textarea>
        <span class="w-hint help">Pseudos ou adresses twitch.tv, séparés par des virgules.</span>
      </label>
      <div class="w-row">
        {#if signedIn}
          <span class="w-hint">Compte Twitch connecté</span>
          <button type="button" class="action" onclick={logout}>Se déconnecter</button>
        {:else}
          <button type="button" class="action primary" onclick={() => window.photon.twitchLogin()}
            >Se connecter à Twitch</button
          >
        {/if}
      </div>
    </div>
  {:else if !feed}
    <p class="w-message">Lecture…</p>
  {:else if !ready}
    <div class="intro">
      <p class="w-message">Connecte-toi pour voir qui est en live parmi tes suivis.</p>
      <button type="button" class="action primary" onclick={() => window.photon.twitchLogin()}
        >Se connecter à Twitch</button
      >
    </div>
  {:else if feed.updatedAt === null && !feed.error}
    <p class="w-message">Recherche des lives…</p>
  {:else if !lives.length}
    <p class="w-message">{feed.error ? 'Hors ligne' : 'Personne en live pour l’instant.'}</p>
  {:else}
    <ul class="w-list">
      {#each lives as live (live.login)}
        <li>
          <button
            type="button"
            class="live"
            title={live.title}
            onclick={() => window.photon.openUrl(`https://www.twitch.tv/${live.login}`)}
          >
            {#if live.preview}<img class="preview" src={live.preview} alt="" />{/if}
            {#if live.avatar}
              <img class="avatar" src={live.avatar} alt="" />
            {:else}
              <span class="avatar"></span>
            {/if}
            <span class="info">
              <span class="name"
                >{live.name}{#if live.game}<span class="game">{` · ${live.game}`}</span>{/if}</span
              >
              <span class="title">{live.title}</span>
              <span class="mini"
                ><span class="dot"></span>{viewers(live.viewers)} · {duration(
                  live.since,
                  now
                )}</span
              >
            </span>
            <span class="stats">
              <span class="viewers"><span class="dot"></span>{viewers(live.viewers)}</span>
              <span class="time">{duration(live.since, now)}</span>
            </span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .edit {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .intro {
    margin: auto 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }

  .intro .w-message {
    margin: 0;
  }

  .live {
    width: 100%;
    min-height: 48px;
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

  .live:hover {
    background: var(--surface-hover);
  }

  .avatar {
    flex: none;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--white-5);
    box-shadow: 0 0 0 2px var(--danger);
  }

  .preview {
    display: none;
    flex: none;
    width: 96px;
    height: 54px;
    border-radius: var(--radius-icon);
    object-fit: cover;
    background: var(--white-5);
  }

  .info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .name,
  .title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .name {
    font-size: var(--text-14);
    font-weight: var(--weight-medium);
  }

  .game {
    font-weight: var(--weight-regular);
    color: var(--text-faint);
  }

  .title {
    font-size: var(--text-12);
    color: var(--text-muted);
  }

  .stats {
    flex: none;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
    font-size: var(--text-12);
    font-variant-numeric: tabular-nums;
  }

  .viewers {
    display: flex;
    align-items: center;
    gap: 5px;
    color: var(--text);
  }

  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--danger);
  }

  .time {
    color: var(--text-faint);
  }

  .mini {
    display: none;
    align-items: center;
    gap: 5px;
    font-size: var(--text-12);
    color: var(--text-muted);
    white-space: nowrap;
  }

  /* Carte large : l'aperçu du live remplace l'avatar. */
  @container (min-width: 440px) {
    .live:has(.preview) .avatar {
      display: none;
    }

    .preview {
      display: block;
    }
  }

  /* Carte étroite : spectateurs et durée sous le pseudo, à la place du titre. */
  @container (max-width: 240px) {
    .stats,
    .title,
    .game {
      display: none;
    }

    .mini {
      display: flex;
    }

    .help {
      display: none;
    }
  }
</style>
