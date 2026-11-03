<script lang="ts">
  // Pastilles de sujets (filtre), puis les articles du plus récent au plus ancien : titre, source,
  // âge. Un clic ouvre l'article dans le navigateur. Mode édition : la liste des sujets.
  import type { NewsFeed } from '../../../shared/api'
  import { pollWhileVisible } from '../../lib/poll.svelte'
  import type { WidgetProps } from '../types'
  import { ago } from './ago'
  import type { NewsSettings } from './manifest'

  let { settings, editing, save }: WidgetProps<NewsSettings> = $props()

  let feed = $state.raw<NewsFeed | null>(null)
  let now = $state(Date.now())
  let filter = $state('') // '' : tous les sujets

  // Cache de Photon seulement : relu souvent, ne coûte rien.
  pollWhileVisible(async () => {
    feed = await window.photon.news(settings.topics)
    now = Date.now()
  }, 10_000)

  // Même découpage que src/main/news.ts (parseTopics) pour les pastilles.
  const topics = $derived([
    ...new Set(
      settings.topics
        .split(/[,;\n]+/)
        .map((t) => t.trim())
        .filter(Boolean)
    )
  ])
  const shown = $derived(feed?.items.filter((item) => !filter || item.topic === filter) ?? [])
  // Un flux RSS en sujet : la pastille montre le site, pas l'adresse entière.
  const chip = (topic: string): string =>
    topic.startsWith('https://')
      ? (topic
          .slice(8)
          .replace(/^www\./, '')
          .split('/')[0] ?? topic)
      : topic

  $effect(() => {
    if (filter && !topics.includes(filter)) filter = ''
  })
</script>

<div class="widget">
  <span class="label">Actualités</span>
  {#if editing || !settings.topics.trim()}
    <label class="field">
      Sujets, séparés par des virgules
      <textarea
        value={settings.topics}
        placeholder="Intelligence artificielle, Formule 1, Bitcoin"
        maxlength="1000"
        rows="3"
        onchange={(event) => save({ ...settings, topics: event.currentTarget.value.trim() })}
      ></textarea>
      <span class="hint">Un mot-clé (Google Actualités) ou l’adresse RSS d’un site, 8 au plus.</span
      >
    </label>
  {:else}
    {#if topics.length > 1}
      <div class="chips" data-no-drag>
        <button type="button" class="chip" class:selected={!filter} onclick={() => (filter = '')}
          >Tout</button
        >
        {#each topics as topic (topic)}
          <button
            type="button"
            class="chip"
            class:selected={filter === topic}
            title={topic}
            onclick={() => (filter = topic)}>{chip(topic)}</button
          >
        {/each}
      </div>
    {/if}
    {#if shown.length}
      <ul>
        {#each shown as item (item.link)}
          <li>
            <button type="button" onclick={() => window.photon.newsOpen(item.link)}>
              <span class="title">{item.title}</span>
              <span class="meta"
                >{[item.source, ago(item.date, now)].filter(Boolean).join(' · ')}</span
              >
            </button>
          </li>
        {/each}
      </ul>
    {:else if !feed || feed.loading}
      <p class="empty">Lecture des actualités…</p>
    {:else}
      <p class="empty">Aucun article pour l’instant.</p>
    {/if}
    {#if feed?.failed.length}
      <p class="empty">Hors ligne ou introuvable : {feed.failed.map(chip).join(', ')}</p>
    {/if}
  {/if}
</div>

<style>
  .widget {
    box-sizing: border-box;
    height: 100%;
    padding: clamp(12px, 8cqmin, 20px);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .label {
    font-size: var(--text-12);
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
    color: var(--text-faint);
  }

  button {
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .chips {
    display: flex;
    gap: 6px;
    overflow-x: auto;
    scrollbar-width: none;
    flex-shrink: 0;
  }

  .chip {
    flex-shrink: 0;
    max-width: 160px;
    height: var(--control-h-chip);
    padding: 0 10px;
    border-radius: var(--radius-pill);
    background: var(--white-5);
    color: var(--text-muted);
    font-size: var(--text-12);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .chip:hover {
    background: var(--surface-hover);
  }

  .chip.selected {
    background: var(--surface-accent-soft);
    color: var(--accent);
  }

  ul {
    flex: 1;
    min-height: 0;
    margin: 0 -8px;
    padding: 0;
    list-style: none;
    overflow-y: auto;
  }

  li button {
    width: 100%;
    padding: 7px 8px;
    border-radius: var(--radius-row);
    display: flex;
    flex-direction: column;
    gap: 2px;
    transition: background var(--dur-fast) var(--ease-out);
  }

  li button:hover {
    background: var(--surface-hover);
  }

  .title {
    font-size: var(--text-14);
    line-height: 1.3;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
  }

  .meta {
    font-size: var(--text-12);
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

  .field textarea {
    padding: 8px 10px;
    border: 1px solid var(--line);
    border-radius: var(--radius-input);
    background: var(--white-5);
    color: var(--text);
    font: inherit;
    font-size: var(--text-13);
    resize: none;
  }

  .hint,
  .empty {
    margin: 0;
    font-size: var(--text-12);
    color: var(--text-faint);
  }
</style>
