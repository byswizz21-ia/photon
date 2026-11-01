<script lang="ts">
  // Lanceur : une tuile par app. Clic ou Entrée = lancer ; glisser-déposer ou « Ajouter » = ajouter.
  import AppWindowIcon from 'phosphor-svelte/lib/AppWindowIcon'
  import DownloadSimpleIcon from 'phosphor-svelte/lib/DownloadSimpleIcon'
  import PlusIcon from 'phosphor-svelte/lib/PlusIcon'
  import XIcon from 'phosphor-svelte/lib/XIcon'
  import type { WidgetProps } from '../types'
  import type { LauncherSettings } from './manifest'

  let { settings, editing, save }: WidgetProps<LauncherSettings> = $props()

  // Chemins Windows : la casse ne compte pas (C:\A et c:\a sont le même fichier).
  const key = (path: string): string => path.toLowerCase()

  // Le profil se modifie à la main : on ne garde que les chemins valides, sans doublon.
  const apps = $derived(
    settings.apps.filter(
      (path, i, all) =>
        typeof path === 'string' &&
        path !== '' &&
        all.findIndex((other) => typeof other === 'string' && key(other) === key(path)) === i
    )
  )

  // « C:\Users\Hugo\Discord.lnk » → « Discord »
  function nameOf(path: string): string {
    const file =
      path
        .replace(/[\\/]+$/, '')
        .split(/[\\/]/)
        .pop() ?? path
    return file.replace(/\.[^.]*$/, '') || file
  }

  // Icônes : demandées une seule fois par chemin, gardées tant que Photon tourne.
  // undefined = en chargement, null = pas d'icône (on affiche l'icône générique).
  let icons = $state<Record<string, string | null>>({})
  const requested: string[] = []

  $effect(() => {
    for (const path of apps) {
      if (requested.includes(path)) continue
      requested.push(path)
      void window.photon
        .fileIcon(path)
        .catch(() => null)
        .then((icon) => (icons[path] = icon))
    }
  })

  // Lancement : si Windows ouvre l'app, Photon se cache tout seul ; sinon la tuile signale l'échec.
  let failed = $state('')
  let failTimer: ReturnType<typeof setTimeout> | undefined
  let launching = false // un double-clic ne lance pas l'app deux fois

  // Mode édition = ranger, pas utiliser : un clic sur une tuile ne lance rien.
  async function run(path: string): Promise<void> {
    if (launching || editing) return
    launching = true
    const opened = await window.photon.launch(path).catch(() => false)
    launching = false
    if (opened) return
    failed = path
    clearTimeout(failTimer)
    failTimer = setTimeout(() => (failed = ''), 2000)
  }

  function add(paths: string[]): void {
    const known = apps.map(key)
    const fresh: string[] = []
    for (const path of paths) {
      if (known.includes(key(path))) continue
      known.push(key(path))
      fresh.push(path)
    }
    if (fresh.length > 0) save({ ...settings, apps: [...apps, ...fresh] })
  }

  function remove(path: string): void {
    save({ ...settings, apps: apps.filter((p) => p !== path) })
  }

  async function pick(): Promise<void> {
    add(await window.photon.pickApps())
  }

  // Dépôt de fichiers, en mode normal comme en mode édition.
  let over = $state(false)

  function onDragOver(event: DragEvent): void {
    event.preventDefault()
    over = event.dataTransfer?.types.includes('Files') ?? false
  }

  // dragleave part aussi quand le curseur passe sur une tuile : on ne ferme qu'en sortant du widget.
  function onDragLeave(event: DragEvent & { currentTarget: HTMLElement }): void {
    const to = event.relatedTarget
    if (!(to instanceof Node && event.currentTarget.contains(to))) over = false
  }

  function onDrop(event: DragEvent): void {
    event.preventDefault()
    over = false
    const files = [...(event.dataTransfer?.files ?? [])]
    add(files.map((file) => window.photon.pathForFile(file)).filter(Boolean))
  }
</script>

<div
  class="widget"
  class:over
  role="group"
  aria-label="Apps"
  ondragover={onDragOver}
  ondragleave={onDragLeave}
  ondrop={onDrop}
>
  <div class="scroll">
    <span class="label" aria-hidden="true">Apps</span>
    <div class="tiles">
      {#if apps.length === 0}
        <p class="hint">Glisse un raccourci ici</p>
      {/if}
      {#each apps as path (path)}
        {@const name = nameOf(path)}
        {@const icon = icons[path]}
        <div class="item">
          <button
            type="button"
            class="tile"
            class:failed={failed === path}
            title={failed === path ? 'Introuvable' : name}
            onclick={() => run(path)}
          >
            <span class="square">
              {#if icon}
                <img src={icon} alt="" width="32" height="32" draggable="false" />
              {:else if icon === null}
                <AppWindowIcon
                  size={32}
                  weight="duotone"
                  color="var(--accent)"
                  aria-hidden="true"
                />
              {/if}
            </span>
            <span class="name">{name}</span>
          </button>
          {#if editing}
            <button
              type="button"
              class="remove"
              aria-label="Retirer {name}"
              onclick={() => remove(path)}
            >
              <XIcon size={14} weight="duotone" aria-hidden="true" />
            </button>
          {/if}
        </div>
      {/each}
      {#if editing || apps.length === 0}
        <div class="item">
          <button type="button" class="tile add" onclick={pick}>
            <span class="square">
              <PlusIcon size={32} weight="duotone" color="var(--accent)" aria-hidden="true" />
            </span>
            <span class="name">Ajouter</span>
          </button>
        </div>
      {/if}
    </div>
  </div>
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
  }

  /* Défilement vertical interne s'il y a trop d'apps, avec une barre discrète. */
  .scroll {
    box-sizing: border-box;
    height: 100%;
    padding: clamp(14px, 6cqmin, 24px);
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow: hidden auto;
    scrollbar-width: thin;
    scrollbar-color: rgb(255 255 255 / 0.2) transparent;
  }

  .label {
    font-size: var(--text-12);
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
    color: var(--text-faint);
  }

  .tiles {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 16px;
  }

  .item {
    position: relative;
  }

  .tile {
    width: 72px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 0;
    border: 0;
    border-radius: var(--radius-row);
    background: none;
    cursor: pointer;
    transition: transform var(--dur-spring) var(--ease-spring);
  }

  .tile:hover {
    transform: translateY(-2px);
  }

  /* Appui : 97 % puis retour en ressort (le ressort vient de la transition de base). */
  .tile:active {
    transform: scale(0.97);
    transition-duration: var(--dur-press);
  }

  .square {
    box-sizing: border-box;
    width: 64px;
    height: 64px;
    display: grid;
    place-items: center;
    border: 1px solid var(--line);
    border-radius: var(--radius-tile);
    background: var(--white-7);
  }

  .tile:hover .square {
    background: var(--white-12);
  }

  .tile.failed .square {
    border-color: rgb(255 107 125 / 0.6);
  }

  .add .square {
    border-style: dashed;
    background: transparent;
  }

  .name {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--text-12);
    color: var(--text-muted);
  }

  /* Petit rond en haut à droite de la tuile (mode édition), comme le bouton de la carte. */
  .remove {
    position: absolute;
    top: -6px;
    right: -2px;
    width: 20px;
    height: 20px;
    display: grid;
    place-items: center;
    padding: 0;
    border: 1px solid var(--line);
    border-radius: 50%;
    background: var(--surface-chip);
    color: var(--text);
    cursor: pointer;
  }

  .remove:hover {
    background: var(--surface-chip-danger);
    color: var(--danger-text);
  }

  /* État vide : le texte se centre sur la hauteur du carré de la tuile « Ajouter ». */
  .hint {
    height: 64px;
    margin: 0;
    display: flex;
    align-items: center;
    font-size: var(--text-13);
    color: var(--text-muted);
  }

  /* Carte basse (1 case) : une rangée d'icônes seules, sans titre ni noms (nom au survol). */
  @container (max-height: 130px) {
    /* safe : s'il y a trop d'icônes, le haut ne sort pas de la carte (défilement normal). */
    .scroll {
      justify-content: safe center;
    }

    .label,
    .name {
      display: none;
    }

    .tiles {
      gap: 10px;
    }

    .tile {
      width: auto;
    }

    .square {
      width: 48px;
      height: 48px;
    }

    .hint {
      height: 48px;
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
