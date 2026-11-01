<script lang="ts">
  // Favoris en pastilles (clic = ouvrir), récents en liste dessous. Ajout : « + » en mode
  // édition ou dossier glissé sur le widget.
  import FileIcon from 'phosphor-svelte/lib/FileIcon'
  import FolderIcon from 'phosphor-svelte/lib/FolderIcon'
  import PlusIcon from 'phosphor-svelte/lib/PlusIcon'
  import XIcon from 'phosphor-svelte/lib/XIcon'
  import type { RecentFile } from '../../../shared/api'
  import { pollWhileVisible } from '../../lib/poll.svelte'
  import type { WidgetProps } from '../types'
  import type { FoldersSettings } from './manifest'

  let { settings, editing, save }: WidgetProps<FoldersSettings> = $props()

  const key = (path: string): string => path.toLowerCase()
  const folders = $derived(
    settings.folders.filter(
      (p, i, all) =>
        typeof p === 'string' && p !== '' && all.findIndex((o) => key(o) === key(p)) === i
    )
  )
  const nameOf = (path: string): string =>
    path
      .replace(/[\\/]+$/, '')
      .split(/[\\/]/)
      .pop() || path

  let recents = $state.raw<RecentFile[]>([])
  pollWhileVisible(async () => {
    recents = await window.photon.recentFiles()
  }, 10_000)

  // Icônes Windows, demandées une fois par chemin.
  let icons = $state<Record<string, string | null>>({})
  $effect(() => {
    for (const path of [...folders, ...recents.map((r) => r.path)]) {
      if (path in icons) continue
      icons[path] = null
      void window.photon.fileIcon(path).then((icon) => (icons[path] = icon))
    }
  })

  // Ouvrir cache Photon (comme le lanceur) ; en mode édition, rien ne s'ouvre.
  const open = (path: string): void => {
    if (!editing) void window.photon.launch(path)
  }

  function add(paths: string[]): void {
    const known = folders.map(key)
    const fresh = paths.filter((p) => p && !known.includes(key(p)))
    if (fresh.length) save({ ...settings, folders: [...folders, ...fresh] })
  }

  let over = $state(false)
</script>

<div
  class="widget"
  class:over
  role="group"
  aria-label="Dossiers"
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
  <span class="label">Favoris</span>
  <div class="favorites">
    {#each folders as path (path)}
      <span class="chip">
        <button type="button" class="open" title={path} onclick={() => open(path)}>
          {#if icons[path]}<img src={icons[path]} alt="" />{:else}<FolderIcon
              size={16}
              weight="duotone"
              aria-hidden="true"
            />{/if}
          {nameOf(path)}
        </button>
        {#if editing}
          <button
            type="button"
            class="remove"
            aria-label="Retirer {nameOf(path)}"
            onclick={() => save({ ...settings, folders: folders.filter((p) => p !== path) })}
          >
            <XIcon size={12} aria-hidden="true" />
          </button>
        {/if}
      </span>
    {/each}
    {#if editing || folders.length === 0}
      <button
        type="button"
        class="chip add"
        onclick={async () => add(await window.photon.pickFolders())}
      >
        <PlusIcon size={14} aria-hidden="true" /> Ajouter
      </button>
    {/if}
  </div>

  {#if recents.length}
    <span class="label recent-label">Récents</span>
    <ul class="recents">
      {#each recents as file (file.path)}
        <li>
          <button type="button" class="row" title={file.path} onclick={() => open(file.path)}>
            {#if icons[file.path]}<img
                src={icons[file.path]}
                alt=""
              />{:else if file.folder}<FolderIcon size={16} aria-hidden="true" />{:else}<FileIcon
                size={16}
                aria-hidden="true"
              />{/if}
            <span>{file.name}</span>
          </button>
        </li>
      {/each}
    </ul>
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
    border-radius: var(--radius);
    transition: box-shadow 200ms var(--ease-out);
  }

  .over {
    box-shadow: inset 0 0 0 2px var(--accent);
  }

  .label {
    font-size: 12px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-faint);
  }

  .recent-label {
    margin-top: 4px;
  }

  .favorites {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  button {
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }

  .chip {
    display: inline-flex;
    align-items: center;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: rgb(255 255 255 / 0.05);
    font-size: 13px;
  }

  .open,
  .chip.add {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 30px;
    padding: 0 12px;
    border-radius: 999px;
  }

  .chip.add {
    color: var(--text-muted);
  }

  .open:hover,
  .chip.add:hover {
    background: rgb(255 255 255 / 0.06);
  }

  .remove {
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
    margin-right: 3px;
    border-radius: 50%;
    color: var(--text-faint);
  }

  .remove:hover {
    color: var(--text);
    background: rgb(255 255 255 / 0.08);
  }

  img {
    width: 16px;
    height: 16px;
  }

  .recents {
    flex: 1;
    min-height: 0;
    margin: 0;
    padding: 0;
    list-style: none;
    overflow-y: auto;
  }

  .row {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 28px;
    padding: 0 6px;
    border-radius: 8px;
    font-size: 13px;
    color: var(--text-muted);
    text-align: left;
  }

  .row span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .row:hover {
    color: var(--text);
    background: rgb(255 255 255 / 0.06);
  }

  button:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  /* Petite case : les favoris seulement. */
  @container (max-height: 180px) {
    .recent-label,
    .recents {
      display: none;
    }
  }
</style>
