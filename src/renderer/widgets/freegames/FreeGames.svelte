<script lang="ts">
  // Jeux gratuits maintenant (vignette, boutique, fin de l'offre), puis ceux annoncés pour la
  // semaine suivante. Cache de Photon relu toutes les 30 s : aucun appel réseau ici.
  // Mode édition : boutiques affichées.
  import type { Feed, FreeGame } from '../../../shared/api'
  import { pollWhileVisible } from '../../lib/poll.svelte'
  import { dayLabel } from '../../lib/when'
  import type { WidgetProps } from '../types'
  import { STORES, type FreeGamesSettings } from './manifest'

  let { settings, editing, save }: WidgetProps<FreeGamesSettings> = $props()

  let feed = $state.raw<Feed<FreeGame> | undefined>()
  let now = $state(new Date())
  pollWhileVisible(async () => {
    feed = await window.photon.freeGames()
    now = new Date()
  }, 30_000)

  const stores = $derived(Array.isArray(settings.stores) ? settings.stores : STORES)
  const games = $derived(
    (feed?.items ?? [])
      .filter((g) => stores.includes(g.store))
      .filter((g) => g.until === null || g.until > now.getTime())
      .sort(
        (a, b) => Number(a.upcoming) - Number(b.upcoming) || (a.until ?? 9e15) - (b.until ?? 9e15)
      )
  )

  function toggle(store: string): void {
    const next = stores.includes(store) ? stores.filter((s) => s !== store) : [...stores, store]
    save({ ...settings, stores: next })
  }

  const ends = (game: FreeGame): string =>
    game.upcoming ? 'bientôt' : game.until ? `jusqu'à ${dayLabel(game.until, now)}` : ''
</script>

<div class="w-body">
  <div class="w-head">
    <span class="w-label">Jeux gratuits</span>
    {#if feed?.error}<span class="w-hint">{feed.error}</span>{/if}
  </div>

  {#if editing}
    <div class="w-chips" data-no-drag>
      {#each STORES as store (store)}
        <button
          type="button"
          class="w-chip"
          class:selected={stores.includes(store)}
          aria-pressed={stores.includes(store)}
          onclick={() => toggle(store)}>{store}</button
        >
      {/each}
    </div>
  {/if}

  {#if !feed || (feed.updatedAt === null && !feed.error)}
    <p class="w-message">Recherche des jeux offerts…</p>
  {:else if !games.length}
    <p class="w-message">{feed.error ? 'Hors ligne' : 'Aucun jeu offert en ce moment.'}</p>
  {:else}
    <ul class="w-list">
      {#each games as game (game.id)}
        <li>
          <button
            type="button"
            class="game"
            class:upcoming={game.upcoming}
            title="Ouvrir la page du jeu"
            onclick={() => game.url && window.photon.openUrl(game.url)}
          >
            {#if game.image}
              <img src={game.image} alt="" />
            {:else}
              <span class="noimg"></span>
            {/if}
            <span class="info">
              <span class="title">{game.title}</span>
              <span class="meta">{[game.store, ends(game)].filter(Boolean).join(' · ')}</span>
            </span>
            {#if game.upcoming}<span class="tag">Bientôt</span>{:else}<span class="tag free"
                >Gratuit</span
              >{/if}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .game {
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

  .game:hover {
    background: var(--surface-hover);
  }

  .game.upcoming {
    opacity: 0.7;
  }

  img,
  .noimg {
    flex: none;
    width: 72px;
    height: 40px;
    border-radius: var(--radius-icon);
    object-fit: cover;
    background: var(--white-5);
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

  .meta {
    font-size: var(--text-12);
    color: var(--text-faint);
  }

  .tag {
    flex: none;
    padding: 2px 8px;
    border-radius: var(--radius-pill);
    background: var(--white-6);
    color: var(--text-muted);
    font-size: var(--text-11);
  }

  .tag.free {
    background: var(--surface-accent-soft);
    color: var(--accent);
  }

  @container (max-width: 280px) {
    img,
    .noimg,
    .tag {
      display: none;
    }
  }
</style>
