<script lang="ts">
  // Un dépôt par ligne : nom, branche, fichiers modifiés, commits à pousser (↑) ou à récupérer (↓),
  // dernier commit. Clic = ouvrir dans VS Code ; icône dossier = Explorateur. Relu toutes les 10 s
  // fenêtre visible. Ajout : « + » en mode édition ou dossier glissé sur le widget.
  import ArrowDownIcon from 'phosphor-svelte/lib/ArrowDownIcon'
  import ArrowUpIcon from 'phosphor-svelte/lib/ArrowUpIcon'
  import CheckIcon from 'phosphor-svelte/lib/CheckIcon'
  import FolderOpenIcon from 'phosphor-svelte/lib/FolderOpenIcon'
  import GitBranchIcon from 'phosphor-svelte/lib/GitBranchIcon'
  import PlusIcon from 'phosphor-svelte/lib/PlusIcon'
  import XIcon from 'phosphor-svelte/lib/XIcon'
  import type { GitRepo } from '../../../shared/api'
  import { pollWhileVisible } from '../../lib/poll.svelte'
  import type { WidgetProps } from '../types'
  import type { GitSettings } from './manifest'

  let { settings, editing, save }: WidgetProps<GitSettings> = $props()

  const key = (path: string): string => path.toLowerCase().replace(/[\\/]+$/, '')
  const folders = $derived(
    settings.folders.filter(
      (p, i, all) =>
        typeof p === 'string' && p !== '' && all.findIndex((o) => key(o) === key(p)) === i
    )
  )

  let repos = $state.raw<GitRepo[] | null>(null)
  const read = async (): Promise<void> => {
    repos = await window.photon.gitStatus($state.snapshot(folders))
  }
  pollWhileVisible(read, 10_000)

  // Dossier ajouté ou retiré : relecture tout de suite.
  $effect(() => {
    void folders.length
    void read()
  })

  function add(paths: string[]): void {
    const known = folders.map(key)
    const fresh = paths.filter((p) => p && !known.includes(key(p)))
    if (fresh.length) save({ ...settings, folders: [...folders, ...fresh] })
  }

  const relative = new Intl.RelativeTimeFormat('fr-FR', { numeric: 'auto' })
  function ago(at: number): string {
    const minutes = Math.round((at - Date.now()) / 60_000)
    if (Math.abs(minutes) < 60) return relative.format(minutes, 'minute')
    const hours = Math.round(minutes / 60)
    if (Math.abs(hours) < 24) return relative.format(hours, 'hour')
    return relative.format(Math.round(hours / 24), 'day')
  }

  const plural = (n: number, word: string): string => `${n} ${word}${n > 1 ? 's' : ''}`

  let over = $state(false)
</script>

<div
  class="widget"
  class:over
  role="group"
  aria-label="Projets Git"
  ondragover={(event) => {
    event.preventDefault()
    over = event.dataTransfer?.types.includes('Files') ?? false
  }}
  ondragleave={(event) => {
    const to = event.relatedTarget
    if (!(to instanceof Node && event.currentTarget.contains(to))) over = false
  }}
  ondrop={(event) => {
    event.preventDefault()
    over = false
    add([...(event.dataTransfer?.files ?? [])].map((file) => window.photon.pathForFile(file)))
  }}
>
  <div class="head">
    <span class="label">Projets Git</span>
    {#if editing || folders.length === 0}
      <button
        type="button"
        class="add"
        data-no-drag
        onclick={async () => add(await window.photon.pickFolders())}
      >
        <PlusIcon size={14} aria-hidden="true" /> Ajouter
      </button>
    {/if}
  </div>

  {#if folders.length === 0}
    <p class="empty">Ajoute un dossier de projet, ou glisse-le ici.</p>
  {:else if repos}
    <ul>
      {#each repos as repo (repo.path)}
        <li>
          <button
            type="button"
            class="row"
            title="Ouvrir {repo.path} dans VS Code"
            disabled={editing || repo.error !== null}
            onclick={() => window.photon.gitOpen(repo.path)}
          >
            <span class="top">
              <span class="name">{repo.name}</span>
              {#if repo.ahead}<span
                  class="sync ahead"
                  title={plural(repo.ahead, 'commit') + ' à pousser'}
                  ><ArrowUpIcon size={12} weight="bold" aria-hidden="true" />{repo.ahead}</span
                >{/if}
              {#if repo.behind}<span
                  class="sync"
                  title={plural(repo.behind, 'commit') + ' à récupérer'}
                  ><ArrowDownIcon size={12} weight="bold" aria-hidden="true" />{repo.behind}</span
                >{/if}
            </span>
            {#if repo.error}
              <span class="line error">{repo.error}</span>
            {:else}
              <span class="line">
                <GitBranchIcon size={13} aria-hidden="true" />
                <span class="branch">{repo.branch}</span>
                {#if repo.changed || repo.untracked}
                  <span class="dirty">
                    · {[
                      repo.changed ? plural(repo.changed, 'modif') : '',
                      repo.untracked
                        ? `${repo.untracked} nouveau${repo.untracked > 1 ? 'x' : ''}`
                        : ''
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                {:else if !repo.ahead}
                  <span class="clean"><CheckIcon size={12} aria-hidden="true" /> à jour</span>
                {/if}
              </span>
              {#if repo.commit}
                <span class="line commit" title={repo.commit.subject}>
                  <span class="subject">{repo.commit.subject}</span>
                  <span class="when">{ago(repo.commit.at)}</span>
                </span>
              {/if}
            {/if}
          </button>
          {#if editing}
            <button
              type="button"
              class="side"
              aria-label="Retirer {repo.name}"
              data-no-drag
              onclick={() =>
                save({ ...settings, folders: folders.filter((p) => key(p) !== key(repo.path)) })}
            >
              <XIcon size={12} aria-hidden="true" />
            </button>
          {:else}
            <button
              type="button"
              class="side"
              aria-label="Ouvrir {repo.name} dans l'Explorateur"
              title="Ouvrir dans l'Explorateur"
              onclick={() => window.photon.launch(repo.path)}
            >
              <FolderOpenIcon size={14} aria-hidden="true" />
            </button>
          {/if}
        </li>
      {/each}
    </ul>
  {:else}
    <p class="empty">Lecture des dépôts…</p>
  {/if}
</div>

<style>
  .widget {
    box-sizing: border-box;
    height: 100%;
    padding: clamp(12px, 7cqmin, 20px);
    display: flex;
    flex-direction: column;
    gap: 8px;
    border-radius: var(--radius);
    transition: box-shadow var(--dur-hover) var(--ease-out);
  }

  .over {
    box-shadow: inset 0 0 0 2px var(--accent);
  }

  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .label {
    font-size: var(--text-12);
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
    color: var(--text-faint);
  }

  button {
    border: none;
    background: none;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }

  .add {
    display: flex;
    align-items: center;
    gap: 4px;
    min-height: var(--control-h-chip);
    padding: 0 10px;
    border-radius: var(--radius-pill);
    background: var(--white-6);
    font-size: var(--text-12);
    color: var(--text-muted);
  }

  .add:hover {
    background: var(--white-9);
    color: var(--text);
  }

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow-y: auto;
  }

  li {
    display: flex;
    align-items: flex-start;
    gap: 2px;
  }

  .row {
    flex: 1;
    min-width: 0;
    padding: 6px 8px;
    border-radius: var(--radius-row);
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 3px;
    text-align: left;
    transition: background var(--dur-fast) var(--ease-out);
  }

  .row:not(:disabled):hover {
    background: var(--surface-hover);
  }

  .row:disabled {
    cursor: default;
  }

  .top {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .name {
    flex: 1;
    min-width: 0;
    font-size: var(--text-14);
    font-weight: var(--weight-medium);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sync {
    display: flex;
    align-items: center;
    gap: 2px;
    font-size: var(--text-12);
    font-variant-numeric: tabular-nums;
    color: var(--text-muted);
  }

  .sync.ahead {
    color: var(--accent);
  }

  .line {
    display: flex;
    align-items: center;
    gap: 5px;
    min-width: 0;
    font-size: var(--text-12);
    color: var(--text-muted);
    white-space: nowrap;
  }

  .branch {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dirty {
    color: var(--accent-orange);
  }

  .clean {
    display: flex;
    align-items: center;
    gap: 3px;
    color: var(--text-faint);
  }

  .commit {
    color: var(--text-faint);
  }

  .subject {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .when {
    flex: none;
  }

  .error {
    color: var(--danger-text);
  }

  .side {
    flex: none;
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    margin-top: 4px;
    border-radius: 50%;
    color: var(--text-faint);
  }

  .side:hover {
    background: var(--white-8);
    color: var(--text);
  }

  button:focus-visible {
    outline: var(--focus-ring);
    outline-offset: -2px;
  }

  .empty {
    margin: 0;
    font-size: var(--text-13);
    color: var(--text-faint);
  }

  /* Une seule ligne de haut : nom et état seulement. */
  @container (max-height: 120px) {
    .commit {
      display: none;
    }
  }
</style>
