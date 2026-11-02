<script lang="ts" module>
  export type MediaKind = 'image' | 'gif' | 'video'
  export type MediaPatch = { file?: string; fit?: string; sound?: boolean }
</script>

<script lang="ts">
  // Image, GIF ou vidéo bord à bord : widgets Image, GIF et Vidéo (réglages propres à chacun,
  // traduits par leur composant). « Choisir », glisser-déposer un fichier ou un lien (navigateur),
  // ou coller un lien (GIF). Copie chez Photon (src/main/background.ts, download.ts).
  // Vidéo : en boucle, muette par défaut, en pause tant que Photon est caché.
  import DownloadSimpleIcon from 'phosphor-svelte/lib/DownloadSimpleIcon'
  import FilmStripIcon from 'phosphor-svelte/lib/FilmStripIcon'
  import GifIcon from 'phosphor-svelte/lib/GifIcon'
  import ImageIcon from 'phosphor-svelte/lib/ImageIcon'
  import SpeakerHighIcon from 'phosphor-svelte/lib/SpeakerHighIcon'
  import SpeakerSlashIcon from 'phosphor-svelte/lib/SpeakerSlashIcon'
  import { copyUrl, isImage, isVideo } from '../../shared/api'
  import { app } from '../state.svelte'

  interface Props {
    kind: MediaKind
    file: string // nom de la copie ; '' : rien de choisi
    fit: string // 'cover' | 'contain'
    sound?: boolean // vidéo seulement
    editing: boolean
    change(patch: MediaPatch): void
  }

  let { kind, file, fit, sound = false, editing, change }: Props = $props()

  const KINDS = {
    image: {
      name: 'Image',
      icon: ImageIcon,
      hint: 'Glisse une image ici',
      refused: 'Image illisible ou trop lourde (30 Mo max)',
      accepts: isImage
    },
    gif: {
      name: 'GIF',
      icon: GifIcon,
      hint: 'Glisse un GIF ou colle un lien Giphy, Tenor…',
      refused: 'GIF illisible, trop lourd ou lien non reconnu',
      accepts: (name: string) => isImage(name) || isVideo(name) // Tenor : GIF en mp4
    },
    video: {
      name: 'Vidéo',
      icon: FilmStripIcon,
      hint: 'Glisse une vidéo ici (mp4, webm, mov)',
      refused: 'Vidéo illisible ou trop lourde (500 Mo max)',
      accepts: isVideo
    }
  }
  const config = $derived(KINDS[kind])
  const contain = $derived(fit === 'contain')

  let broken = $state(false) // copie supprimée à la main, format illisible : on repropose
  let refused = $state(false)
  let busy = $state(false) // copie ou téléchargement en cours (grosse vidéo : quelques secondes)
  let linking = $state(false) // GIF : champ du lien ouvert, l'ancien GIF reste en attendant

  // Copie un fichier (chemin) ou télécharge un lien, puis le garde si le widget l'accepte.
  async function use(source: { path: string } | { url: string } | null): Promise<void> {
    if (!source || busy) return
    busy = true
    let name: string | null = null
    if ('url' in source) name = await window.photon.importUrl(source.url)
    else if (config.accepts(source.path))
      name = await window.photon.importFile(isVideo(source.path) ? 'video' : 'image', source.path)
    busy = false
    refused = !name || !config.accepts(name)
    if (refused || !name) return
    broken = false
    linking = false
    change({ file: name })
  }

  async function pick(): Promise<void> {
    const path = await window.photon.pickFile(kind === 'video' ? 'video' : 'image')
    await use(path ? { path } : null)
  }

  let link = $state('')

  function submitLink(event: SubmitEvent): void {
    event.preventDefault()
    const url = link.trim()
    link = ''
    if (url) void use({ url })
  }

  let video = $state<HTMLVideoElement>()

  // Rien ne tourne fenêtre cachée (Photon garde la page en vie, sans freinage d'arrière-plan).
  $effect(() => {
    if (!video) return
    if (app.visible)
      video.play().catch(() => {}) // lecture refusée : la vidéo reste en pause
    else video.pause()
  })

  let over = $state(false)

  function onDragOver(event: DragEvent): void {
    event.preventDefault()
    const types = event.dataTransfer?.types ?? []
    over = types.includes('Files') || types.includes('text/uri-list')
  }

  // dragleave part aussi en passant sur un bouton : on ne ferme qu'en sortant du widget.
  function onDragLeave(event: DragEvent & { currentTarget: HTMLElement }): void {
    const to = event.relatedTarget
    if (!(to instanceof Node && event.currentTarget.contains(to))) over = false
  }

  // Fichier du disque, sinon lien (image glissée depuis le navigateur).
  function onDrop(event: DragEvent): void {
    event.preventDefault()
    over = false
    const file = event.dataTransfer?.files[0]
    if (file) return void use({ path: window.photon.pathForFile(file) })
    const url = event.dataTransfer?.getData('text/uri-list').split(/\r?\n/)[0]
    if (url) void use({ url })
  }
</script>

<div
  class="widget"
  class:over
  role="group"
  aria-label={config.name}
  ondragover={onDragOver}
  ondragleave={onDragLeave}
  ondrop={onDrop}
>
  {#if file && !broken && !linking}
    {#key file}
      {#if isVideo(file)}
        <video
          bind:this={video}
          class:contain
          src={copyUrl(file)}
          muted={!sound}
          loop
          playsinline
          disablepictureinpicture
          draggable="false"
          onerror={() => (broken = true)}
        ></video>
      {:else}
        <img
          class:contain
          src={copyUrl(file)}
          alt=""
          draggable="false"
          onerror={() => (broken = true)}
          onload={() => (broken = false)}
        />
      {/if}
    {/key}
    {#if editing}
      <div class="tools" data-no-drag>
        <button type="button" class="action" disabled={busy} onclick={pick}>
          {busy ? 'Copie…' : 'Changer…'}
        </button>
        <button
          type="button"
          class="action"
          onclick={() => change({ fit: contain ? 'cover' : 'contain' })}
        >
          {contain ? 'Remplir' : 'Entière'}
        </button>
        {#if isVideo(file) && kind === 'video'}
          <button
            type="button"
            class="action icon"
            aria-label={sound ? 'Couper le son' : 'Activer le son'}
            title={sound ? 'Couper le son' : 'Activer le son'}
            onclick={() => change({ sound: !sound })}
          >
            {#if sound}
              <SpeakerHighIcon size={18} aria-hidden="true" />
            {:else}
              <SpeakerSlashIcon size={18} aria-hidden="true" />
            {/if}
          </button>
        {/if}
        {#if kind === 'gif'}
          <button type="button" class="action" onclick={() => (linking = true)}>Lien…</button>
        {/if}
      </div>
    {/if}
  {:else}
    <div class="empty">
      <config.icon size={28} weight="duotone" color="var(--accent)" aria-hidden="true" />
      <p>{busy ? 'Copie…' : refused ? config.refused : config.hint}</p>
      <button type="button" class="action" data-no-drag disabled={busy} onclick={pick}>
        Choisir…
      </button>
      {#if kind === 'gif'}
        <form class="link" data-no-drag onsubmit={submitLink}>
          <input
            type="url"
            placeholder="https://tenor.com/view/…"
            aria-label="Lien du GIF"
            bind:value={link}
            disabled={busy}
          />
        </form>
      {/if}
      {#if linking}
        <button type="button" class="action" data-no-drag onclick={() => (linking = false)}>
          Annuler
        </button>
      {/if}
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

  img,
  video {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .contain {
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

  /* Pastilles opaques : lisibles sur une image claire. */
  .tools .action {
    background: var(--surface-chip);
    white-space: nowrap;
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

  .link {
    width: min(100%, 260px);
  }

  .link input {
    box-sizing: border-box;
    width: 100%;
    min-height: var(--control-h-input);
    padding: 0 10px;
    border: 1px solid var(--line);
    border-radius: var(--radius-input);
    background: var(--white-5);
    color: var(--text);
    font: inherit;
    font-size: var(--text-13);
  }

  .link input:focus-visible {
    outline: var(--focus-ring);
    outline-offset: var(--focus-offset);
  }

  /* Petite carte : l'icône et le bouton seulement. */
  @container (max-height: 170px) {
    .link {
      display: none;
    }
  }

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
