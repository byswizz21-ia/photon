<script lang="ts">
  // Miniatures des dernières captures, la plus récente en premier (et plus grande si la place le
  // permet). Glisser une miniature dépose le fichier dans l'app visée ; clic : ouvrir ;
  // boutons au survol : copier l'image, la mettre à la corbeille. Relu toutes les 5 s.
  import CopyIcon from 'phosphor-svelte/lib/CopyIcon'
  import CheckIcon from 'phosphor-svelte/lib/CheckIcon'
  import TrashIcon from 'phosphor-svelte/lib/TrashIcon'
  import type { Screenshot } from '../../../shared/api'
  import { pollWhileVisible } from '../../lib/poll.svelte'
  import type { WidgetProps } from '../types'
  import type { ScreenshotsSettings } from './manifest'

  let { settings, editing, save, preview }: WidgetProps<ScreenshotsSettings> = $props()

  let shots = $state.raw<Screenshot[] | undefined>()
  let copied = $state('')
  let now = $state(Date.now())

  const read = async (): Promise<void> => {
    shots = await window.photon.screenshots(settings.folder)
    now = Date.now()
  }
  pollWhileVisible(read, 5_000)

  function ago(at: number): string {
    const minutes = Math.round((now - at) / 60_000)
    if (minutes < 1) return "à l'instant"
    if (minutes < 60) return `il y a ${minutes} min`
    const hours = Math.round(minutes / 60)
    if (hours < 24) return `il y a ${hours} h`
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(at)
  }

  function drag(event: DragEvent, shot: Screenshot): void {
    event.preventDefault() // Windows prend le relais : vrai fichier glissé
    if (!preview) window.photon.screenshotDrag(shot.path)
  }

  async function copy(shot: Screenshot): Promise<void> {
    if (preview || !(await window.photon.screenshotCopy(shot.path))) return
    copied = shot.path
    setTimeout(() => (copied = ''), 1500)
  }

  async function remove(shot: Screenshot): Promise<void> {
    if (preview) return
    if (await window.photon.screenshotDelete(shot.path)) await read()
  }

  async function pick(): Promise<void> {
    const [folder] = await window.photon.pickFolders()
    if (folder) save({ ...settings, folder })
  }

  const folderName = $derived(settings.folder.split(/[\\/]/).filter(Boolean).pop() ?? '')
</script>

<div class="w-body">
  <div class="w-head">
    <span class="w-label">Captures</span>
    {#if shots?.[0]}<span class="w-hint">{ago(shots[0].at)}</span>{/if}
  </div>

  {#if editing}
    <div class="w-row" data-no-drag>
      <button type="button" class="action" onclick={pick}>Choisir le dossier</button>
      {#if settings.folder}
        <button type="button" class="action" onclick={() => save({ ...settings, folder: '' })}
          >Dossier de Windows</button
        >
      {/if}
    </div>
    <p class="w-hint">
      {settings.folder ? `Dossier : ${folderName}` : "Images › Captures d'écran"}
    </p>
  {/if}

  {#if shots === undefined}
    <p class="w-message">Lecture…</p>
  {:else if !shots.length}
    <p class="w-message">Aucune capture pour l'instant. Win + Maj + S, puis elle apparaît ici.</p>
  {:else}
    <ul class="grid">
      {#each shots as shot, i (shot.path)}
        <li class:first={i === 0} data-no-drag>
          <button
            type="button"
            class="thumb"
            draggable="true"
            title="{shot.name} · glisser vers une autre app, clic pour ouvrir"
            ondragstart={(event) => drag(event, shot)}
            onclick={() => !preview && window.photon.launch(shot.path)}
          >
            {#if shot.thumb}
              <img src={shot.thumb} alt={shot.name} draggable="false" />
            {:else}
              <span class="name">{shot.name}</span>
            {/if}
          </button>
          <span class="tools">
            <button
              type="button"
              class="w-icon tool"
              aria-label="Copier l'image"
              onclick={() => copy(shot)}
            >
              {#if copied === shot.path}
                <CheckIcon size={13} weight="bold" aria-hidden="true" />
              {:else}
                <CopyIcon size={13} aria-hidden="true" />
              {/if}
            </button>
            <button
              type="button"
              class="w-icon tool"
              aria-label="Mettre à la corbeille"
              onclick={() => remove(shot)}
            >
              <TrashIcon size={13} aria-hidden="true" />
            </button>
          </span>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .grid {
    flex: 1;
    min-height: 0;
    margin: 0;
    padding: 0;
    list-style: none;
    overflow-y: auto;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
    grid-auto-rows: 64px;
    gap: 6px;
  }

  /* La plus récente prend deux cases quand la carte est assez large. */
  @container (min-width: 300px) and (min-height: 220px) {
    .first {
      grid-column: span 2;
      grid-row: span 2;
    }
  }

  li {
    position: relative;
    min-width: 0;
  }

  .thumb {
    width: 100%;
    height: 100%;
    padding: 0;
    border: 1px solid var(--line);
    border-radius: var(--radius-row);
    background: var(--white-4);
    overflow: hidden;
    cursor: grab;
    transition: transform var(--dur-spring) var(--ease-spring);
  }

  .thumb:active {
    transform: scale(var(--press-scale));
    transition-duration: var(--dur-press);
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .name {
    padding: 4px;
    font-size: var(--text-11);
    color: var(--text-faint);
    overflow-wrap: anywhere;
  }

  .tools {
    position: absolute;
    top: 4px;
    right: 4px;
    display: flex;
    gap: 2px;
    opacity: 0;
    transition: opacity var(--dur-fast) var(--ease-out);
  }

  li:hover .tools,
  li:focus-within .tools {
    opacity: 1;
  }

  .tool {
    width: 22px;
    height: 22px;
    background: var(--black-30);
    color: var(--text);
  }
</style>
