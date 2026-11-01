<script lang="ts">
  // Image décorative bord à bord. « Choisir » ou glisser-déposer une image (à tout moment) ;
  // en édition : changer d'image, la montrer entière ou remplir la carte.
  import DownloadSimpleIcon from 'phosphor-svelte/lib/DownloadSimpleIcon'
  import ImageIcon from 'phosphor-svelte/lib/ImageIcon'
  import type { WidgetProps } from '../types'
  import type { ImageSettings } from './manifest'

  let { settings, editing, save }: WidgetProps<ImageSettings> = $props()

  const contain = $derived(settings.fit === 'contain')
  let broken = $state(false) // copie supprimée à la main : on repropose d'en choisir une
  let refused = $state(false)

  async function use(path: string | null): Promise<void> {
    if (!path) return
    const image = await window.photon.importFile('image', path)
    refused = !image
    if (!image) return
    broken = false
    save({ ...settings, image })
  }

  let over = $state(false)

  function onDragOver(event: DragEvent): void {
    event.preventDefault()
    over = event.dataTransfer?.types.includes('Files') ?? false
  }

  // dragleave part aussi en passant sur un bouton : on ne ferme qu'en sortant du widget.
  function onDragLeave(event: DragEvent & { currentTarget: HTMLElement }): void {
    const to = event.relatedTarget
    if (!(to instanceof Node && event.currentTarget.contains(to))) over = false
  }

  function onDrop(event: DragEvent): void {
    event.preventDefault()
    over = false
    const file = event.dataTransfer?.files[0]
    if (file) void use(window.photon.pathForFile(file))
  }
</script>

<div
  class="widget"
  class:over
  role="group"
  aria-label="Image"
  ondragover={onDragOver}
  ondragleave={onDragLeave}
  ondrop={onDrop}
>
  {#if settings.image && !broken}
    {#key settings.image}
      <img
        class:contain
        src="photon://images/{settings.image}"
        alt=""
        draggable="false"
        onerror={() => (broken = true)}
        onload={() => (broken = false)}
      />
    {/key}
    {#if editing}
      <div class="tools" data-no-drag>
        <button
          type="button"
          class="action"
          onclick={async () => use(await window.photon.pickFile('image'))}
        >
          Changer…
        </button>
        <button
          type="button"
          class="action"
          onclick={() => save({ ...settings, fit: contain ? 'cover' : 'contain' })}
        >
          {contain ? 'Remplir' : 'Entière'}
        </button>
      </div>
    {/if}
  {:else}
    <div class="empty">
      <ImageIcon size={28} weight="duotone" color="var(--accent)" aria-hidden="true" />
      <p>{refused ? 'Image illisible ou trop lourde (30 Mo max)' : 'Glisse une image ici'}</p>
      <button
        type="button"
        class="action"
        data-no-drag
        onclick={async () => use(await window.photon.pickFile('image'))}
      >
        Choisir…
      </button>
    </div>
  {/if}
  <!-- Calque d'accent : seule son opacité change quand un fichier survole le widget. -->
  <div class="drop" aria-hidden="true">
    <DownloadSimpleIcon size={24} weight="duotone" color="var(--accent)" />
    Dépose ici
  </div>
</div>

<style>
  .widget {
    position: relative;
    height: 100%;
    border-radius: inherit;
    overflow: hidden;
  }

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  img.contain {
    object-fit: contain;
  }

  .tools {
    position: absolute;
    left: 50%;
    bottom: 10px;
    display: flex;
    gap: 6px;
    transform: translateX(-50%);
  }

  .empty {
    box-sizing: border-box;
    height: 100%;
    padding: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: safe center;
    gap: 8px;
    text-align: center;
    overflow: hidden;
  }

  .empty p {
    margin: 0;
    font-size: var(--text-13);
    color: var(--text-muted);
  }

  /* Carte d'une case : l'icône et le bouton seulement. */
  @container (max-height: 130px) {
    .empty p {
      display: none;
    }
  }

  .drop {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    border-radius: inherit;
    background: color-mix(in srgb, var(--accent) 18%, rgb(16 18 24 / 0.9));
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 55%, transparent);
    font-weight: var(--weight-medium);
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--dur-hover) var(--ease-out);
  }

  .over .drop {
    opacity: 1;
  }
</style>
