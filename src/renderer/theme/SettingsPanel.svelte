<script lang="ts">
  // Panneau « Réglages » : thème (fond, accent, verre) enregistré avec le thème, général via saveSettings.
  import XIcon from 'phosphor-svelte/lib/XIcon'
  import {
    BAR_SHORTCUTS,
    NOTIFY_SOURCES,
    SHORTCUTS,
    SOUND_PRESETS,
    shortcutLabel,
    type Background,
    type FontSettings,
    type NotifySettings,
    type Settings,
    type SoundPreset,
    type SoundSettings,
    type Theme
  } from '../../shared/model'
  import type { DisplayInfo } from '../../shared/api'
  import { play, type SoundName } from '../sound.svelte'
  import { app, reducedMotion, saveTheme } from '../state.svelte'
  import { importedFamily, importedFontName, resolvedAccent } from './apply.svelte'

  let { onclose, onintro }: { onclose: () => void; onintro: () => void } = $props()

  const TABS = [
    ['glow', 'Lumineux'],
    ['wallpaper', "Fond d'écran"],
    ['image', 'Image'],
    ['gradient', 'Dégradé']
  ] as const
  const SWATCHES = [
    ['Bleu', '#7CC4FF'],
    ['Violet', '#B69CFF'],
    ['Orange', '#FFB86B'],
    ['Menthe', '#6EF2C2']
  ] as const

  const SOUND_GROUPS = [
    ['window', 'Ouverture et fermeture', 'Quand Photon apparaît ou se cache'],
    ['clicks', 'Clics', 'Boutons, cases, réglages, changement de profil'],
    ['grid', 'Mode édition', 'Ajouter, supprimer, déplacer un widget']
  ] as const

  const soundPresets = Object.entries(SOUND_PRESETS) as [SoundPreset, readonly [string, string]][]
  // Aperçu d'une ambiance : les sons de Photon dans l'ordre d'une utilisation.
  const DEMO: SoundName[] = [
    'open',
    'tap',
    'toggleOn',
    'toggleOff',
    'panelOpen',
    'profile',
    'add',
    'drop',
    'remove',
    'editOff',
    'notify'
  ]
  const DEMO_STEP = 420 // ms entre deux sons

  const px = (value: number): string => `${value} px`
  const percent = (value: number): string => `${Math.round(value * 100)} %`
  const fileName = (path: string): string => path.split(/[\\/]/).pop() ?? path

  const initial = app.theme.background
  // Onglet affiché : « Image » reste affiché tant qu'aucune image n'est choisie (le fond ne change pas).
  let tab = $state(initial.type)
  // Dernières couleurs du dégradé, pour les retrouver en revenant sur l'onglet.
  let lastGradient =
    initial.type === 'gradient'
      ? { from: initial.from, to: initial.to }
      : { from: '#1b2a4a', to: '#5b2a6e' }

  const bg = $derived(app.theme.background)
  const manual = $derived(app.theme.accent !== 'auto')
  const accent = $derived(resolvedAccent())
  // Un raccourci écrit à la main dans settings.json reste affiché.
  const withCurrent = (current: string, list: readonly string[]): readonly string[] =>
    list.includes(current) ? list : [current, ...list]
  const shortcuts = $derived(withCurrent(app.settings.shortcut, SHORTCUTS))
  const barShortcuts = $derived(withCurrent(app.settings.barShortcut, BAR_SHORTCUTS))

  // Écrans branchés, lus à l'ouverture du panneau. Écran fixe débranché : gardé dans la liste.
  let displays = $state<DisplayInfo[]>([])
  void window.photon.displays().then((list) => (displays = list))
  const screens = $derived([
    { id: 'mouse', label: 'Écran de la souris' },
    { id: 'primary', label: 'Écran principal' },
    ...displays,
    ...(/^\d+$/.test(app.settings.screen) && !displays.some((d) => d.id === app.settings.screen)
      ? [{ id: app.settings.screen, label: 'Écran débranché' }]
      : [])
  ])

  let panel: HTMLElement

  // Focus sur le 1er contrôle à l'ouverture.
  $effect(() => {
    panel.querySelector<HTMLElement>('input:checked')?.focus()
  })

  function patchTheme(patch: Partial<Theme>): void {
    Object.assign(app.theme, patch)
    saveTheme()
  }

  function setGradient(patch: Partial<typeof lastGradient>): void {
    lastGradient = { ...lastGradient, ...patch }
    patchTheme({ background: { type: 'gradient', ...lastGradient } })
  }

  function pickTab(id: string): void {
    if (id === 'wallpaper' || id === 'glow') {
      tab = id
      patchTheme({ background: { type: id } })
    } else if (id === 'gradient') {
      tab = 'gradient'
      setGradient({})
    } else {
      tab = 'image'
    }
  }

  // Windows sert l'image d'après le thème enregistré : on l'écrit avant d'afficher le nouveau fond.
  async function chooseImage(): Promise<void> {
    const path = await window.photon.pickFile('image')
    if (!path) return
    const background: Background = { type: 'image', path }
    await window.photon.saveTheme({ ...$state.snapshot(app.theme), background })
    app.theme.background = background
  }

  const font = $derived(app.theme.font)
  const imported = $derived(importedFontName(font.family))

  function patchFont(patch: Partial<FontSettings>): void {
    patchTheme({ font: { ...app.theme.font, ...patch } })
  }

  // « 400 · normale » : graisse du texte courant une fois le décalage appliqué.
  function weightLabel(shift: number): string {
    const weight = 400 + shift
    const name =
      weight <= 250
        ? 'très fine'
        : weight <= 350
          ? 'fine'
          : weight <= 450
            ? 'normale'
            : weight <= 550
              ? 'medium'
              : weight <= 650
                ? 'semi-grasse'
                : 'grasse'
    return `${weight} · ${name}`
  }

  // Polices installées sur Windows (Local Font Access). Demandées à l'ouverture du panneau (le clic
  // sur la roue compte comme geste de l'utilisateur), sinon au 1er clic sur le menu.
  // Refusé ou indisponible : le menu n'a que la police de Photon et celle du thème.
  let installed = $state<string[]>([])
  let asked = false
  type LocalFonts = () => Promise<{ family: string }[]>

  async function loadFonts(): Promise<void> {
    const query = (window as unknown as { queryLocalFonts?: LocalFonts }).queryLocalFonts
    if (asked || !query) return
    asked = true
    try {
      const list = await query()
      installed = [...new Set(list.map((f) => f.family))].sort((a, b) => a.localeCompare(b))
    } catch {
      asked = false // pas de geste de l'utilisateur (Tab) : on redemandera au prochain clic
    }
  }

  void loadFonts()

  // Menu : police de Photon, police du thème (importée, ou Windows absente de la liste), installées.
  const fontOptions = $derived([
    ['', 'Satoshi (police de Photon)'],
    ...(font.family && !installed.includes(font.family)
      ? [[font.family, imported ? `${imported} (importée)` : font.family]]
      : []),
    ...installed.map((family) => [family, family])
  ])

  async function importFont(): Promise<void> {
    const path = await window.photon.pickFile('font')
    const copy = path && (await window.photon.importFile('font', path))
    if (copy) patchFont({ family: importedFamily(copy) })
  }

  async function setting(patch: Partial<Settings>): Promise<void> {
    try {
      app.settings = await window.photon.saveSettings(patch)
    } catch (error) {
      console.error('[photon] réglage non enregistré', error)
    }
  }

  const notifications = $derived(app.settings.notifications)
  const notifySources = Object.entries(NOTIFY_SOURCES)

  function patchNotify(patch: Partial<NotifySettings>): void {
    void setting({ notifications: { ...app.settings.notifications, ...patch } })
  }

  // Sons : appliqués tout de suite (le clic sur la case sonne déjà selon le nouveau choix),
  // enregistrés ensuite. Curseur du volume : enregistré, avec un son d'aperçu, une fois lâché.
  let soundTimer: ReturnType<typeof setTimeout> | undefined
  const sound = $derived(app.settings.sound)

  let demoTimers: ReturnType<typeof setTimeout>[] = []
  $effect(() => () => demoTimers.forEach(clearTimeout)) // panneau fermé : l'aperçu s'arrête

  function demo(full: boolean): void {
    demoTimers.forEach(clearTimeout)
    const names: SoundName[] = full ? DEMO : ['toggleOn', 'notify']
    demoTimers = names.map((name, i) => setTimeout(() => play(name, true), i * DEMO_STEP))
  }

  function pickPreset(preset: SoundPreset): void {
    patchSound({ preset })
    demo(false)
  }

  function patchSound(patch: Partial<SoundSettings>, later = false): void {
    const next = { ...app.settings.sound, ...patch }
    app.settings.sound = next
    clearTimeout(soundTimer)
    if (!later) return void setting({ sound: next })
    soundTimer = setTimeout(() => {
      void setting({ sound: next })
      play('toggleOn', true)
    }, 250)
  }
</script>

{#snippet segmented(
  label: string,
  name: string,
  options: readonly (readonly [string, string])[],
  value: string,
  pick: (id: string) => void
)}
  <fieldset class="seg">
    <legend class="sr">{label}</legend>
    {#each options as [id, text] (id)}
      <label>
        <input type="radio" {name} value={id} checked={value === id} onchange={() => pick(id)} />
        <span>{text}</span>
      </label>
    {/each}
  </fieldset>
{/snippet}

{#snippet range(
  label: string,
  value: number,
  min: number,
  max: number,
  step: number,
  format: (value: number) => string,
  set: (value: number) => void,
  hint?: string
)}
  <label class="field">
    <span class="line">
      <span>{label}</span>
      <span class="value" aria-hidden="true">{format(value)}</span>
    </span>
    <input
      type="range"
      {min}
      {max}
      {step}
      {value}
      aria-valuetext={format(value)}
      style:--fill="{((value - min) / (max - min)) * 100}%"
      oninput={(event) => set(event.currentTarget.valueAsNumber)}
    />
    {#if hint}<small>{hint}</small>{/if}
  </label>
{/snippet}

{#snippet picker(label: string, value: string, set: (value: string) => void)}
  <label class="color">
    <input type="color" {value} oninput={(event) => set(event.currentTarget.value)} />
    <span>{label}</span>
  </label>
{/snippet}

<div class="settings" role="dialog" aria-label="Réglages" bind:this={panel}>
  <header class="head">
    <h2>Réglages</h2>
    <button
      type="button"
      class="action icon"
      aria-label="Fermer les réglages"
      title="Fermer"
      onclick={onclose}
    >
      <XIcon size={18} weight="bold" aria-hidden="true" />
    </button>
  </header>

  <section>
    <h3>Fond</h3>
    {@render segmented('Type de fond', 'background', TABS, tab, pickTab)}
    {#if tab === 'image'}
      <div class="row">
        <button type="button" class="action" onclick={chooseImage}>Choisir une image…</button>
        {#if bg.type === 'image'}
          <span class="file" title={bg.path}>{fileName(bg.path)}</span>
        {/if}
      </div>
    {:else if bg.type === 'gradient'}
      <div class="row">
        {@render picker('Début', bg.from, (from) => setGradient({ from }))}
        {@render picker('Fin', bg.to, (to) => setGradient({ to }))}
      </div>
    {/if}
  </section>

  <section>
    <h3>Couleur d'accent</h3>
    {@render segmented(
      "Mode de l'accent",
      'accent',
      [
        ['auto', 'Selon le fond'],
        ['manual', 'Manuelle']
      ],
      manual ? 'manual' : 'auto',
      (id) => patchTheme({ accent: id === 'manual' ? accent : 'auto' })
    )}
    <div class="row">
      {#each SWATCHES as [name, hex] (hex)}
        <button
          type="button"
          class="swatch"
          style:--c={hex}
          aria-label={name}
          title={name}
          aria-pressed={manual && accent.toLowerCase() === hex.toLowerCase()}
          onclick={() => patchTheme({ accent: hex })}
        ></button>
      {/each}
      {@render picker('Personnalisée', accent, (value) => patchTheme({ accent: value }))}
    </div>
  </section>

  <section>
    <h3>Verre</h3>
    <!-- Mode fenêtre : flou de Windows (acrylic, fixe), sauf avec le flou réglable. -->
    {@render range(
      'Flou du verre',
      app.theme.blur,
      0,
      120,
      1,
      px,
      (blur) => patchTheme({ blur }),
      app.settings.mode === 'window' && !app.settings.liveBlur
        ? 'En mode fenêtre : activer « Flou réglable » ci-dessous'
        : undefined
    )}
    {@render range('Opacité du verre', app.theme.opacity, 0, 1, 0.01, percent, (opacity) =>
      patchTheme({ opacity })
    )}
    <label class="check">
      <input
        type="checkbox"
        checked={app.settings.liveBlur}
        onchange={(event) => setting({ liveBlur: event.currentTarget.checked })}
      />
      <span>Flou réglable en mode fenêtre</span>
      <small>
        Photon filme l'écran derrière lui (≈ 2 % de CPU, seulement ouvert) et n'apparaît plus dans
        les captures d'écran
      </small>
    </label>
    {@render range('Arrondi', app.theme.radius, 0, 40, 1, px, (radius) => patchTheme({ radius }))}
    <div class="field">
      <span class="line" aria-hidden="true">Densité</span>
      {@render segmented(
        'Densité',
        'density',
        [
          ['compact', 'Compacte'],
          ['comfortable', 'Aérée']
        ],
        app.theme.density,
        (id) => patchTheme({ density: id === 'compact' ? 'compact' : 'comfortable' })
      )}
    </div>
  </section>

  <section>
    <h3>Police</h3>
    <label class="field">
      <span class="line">Police</span>
      <select
        value={font.family}
        onpointerdown={loadFonts}
        onchange={(event) => patchFont({ family: event.currentTarget.value })}
      >
        {#each fontOptions as [family, label] (family)}
          <option value={family}>{label}</option>
        {/each}
      </select>
      <small>Polices installées sur Windows, ou un fichier .ttf, .otf, .woff importé</small>
    </label>
    <div class="row">
      <button type="button" class="action" onclick={importFont}>Importer une police…</button>
    </div>
    {@render range('Graisse', font.weight, -200, 300, 50, weightLabel, (weight) =>
      patchFont({ weight })
    )}
    {@render range('Taille du texte', font.scale, 0.8, 1.4, 0.05, percent, (scale) =>
      patchFont({ scale })
    )}
  </section>

  <section>
    <h3>Général</h3>
    <div class="field">
      <span class="line" aria-hidden="true">Mode</span>
      {@render segmented(
        'Mode',
        'mode',
        [
          ['fullscreen', 'Plein écran'],
          ['window', 'Fenêtre']
        ],
        app.settings.mode,
        (id) => setting({ mode: id === 'window' ? 'window' : 'fullscreen' })
      )}
    </div>
    <label class="check">
      <input
        type="checkbox"
        checked={app.settings.alwaysOnTop}
        disabled={app.settings.mode !== 'window'}
        onchange={(event) => setting({ alwaysOnTop: event.currentTarget.checked })}
      />
      <span>Toujours au-dessus</span>
      {#if app.settings.mode !== 'window'}<small>Mode fenêtre uniquement</small>{/if}
    </label>
    <label class="field">
      <span class="line">Écran</span>
      <select
        value={app.settings.screen}
        onchange={(event) => setting({ screen: event.currentTarget.value })}
      >
        {#each screens as option (option.id)}
          <option value={option.id}>{option.label}</option>
        {/each}
      </select>
      <small>Jamais par-dessus un jeu ou une vidéo en plein écran s'il y a un autre écran</small>
    </label>
    <label class="field">
      <span class="line">Raccourci</span>
      <select
        value={app.settings.shortcut}
        onchange={(event) => setting({ shortcut: event.currentTarget.value })}
      >
        {#each shortcuts as shortcut (shortcut)}
          <option value={shortcut}>{shortcutLabel(shortcut)}</option>
        {/each}
      </select>
    </label>
    <label class="field">
      <span class="line">Barre de commande seule</span>
      <select
        value={app.settings.barShortcut}
        onchange={(event) => setting({ barShortcut: event.currentTarget.value })}
      >
        {#each barShortcuts as shortcut (shortcut)}
          <option value={shortcut}>{shortcutLabel(shortcut)}</option>
        {/each}
      </select>
    </label>
    <label class="check">
      <input
        type="checkbox"
        checked={app.settings.reduceMotion}
        onchange={(event) => setting({ reduceMotion: event.currentTarget.checked })}
      />
      <span>Réduire les animations</span>
    </label>
    <button type="button" class="action" disabled={reducedMotion()} onclick={onintro}>
      Revoir l'animation d'ouverture
    </button>
    <label class="check">
      <input
        type="checkbox"
        checked={app.settings.autoProfiles}
        onchange={(event) => setting({ autoProfiles: event.currentTarget.checked })}
      />
      <span>Bascule automatique des profils</span>
      <small>Règles de chaque profil : bouton « Auto » en mode édition</small>
    </label>
  </section>

  <section>
    <h3>Sons</h3>
    <label class="check">
      <input
        type="checkbox"
        checked={sound.enabled}
        onchange={(event) => patchSound({ enabled: event.currentTarget.checked })}
      />
      <span>Sons de Photon</span>
      <small>Le volume de Windows n'est jamais modifié</small>
    </label>
    {#if sound.enabled}
      <fieldset class="presets">
        <legend>Ambiance</legend>
        {#each soundPresets as [id, [name, hint]] (id)}
          <label>
            <input
              type="radio"
              name="sound-preset"
              value={id}
              checked={sound.preset === id}
              onchange={() => pickPreset(id)}
            />
            <span>{name}</span>
            <small>{hint}</small>
          </label>
        {/each}
      </fieldset>
      <button type="button" class="action" onclick={() => demo(true)}>Écouter l'ambiance</button>
      {@render range('Volume', sound.volume, 0, 1, 0.05, percent, (volume) =>
        patchSound({ volume }, true)
      )}
      {#each SOUND_GROUPS as [group, label, hint] (group)}
        <label class="check">
          <input
            type="checkbox"
            checked={sound[group]}
            onchange={(event) => patchSound({ [group]: event.currentTarget.checked })}
          />
          <span>{label}</span>
          <small>{hint}</small>
        </label>
      {/each}
    {/if}
  </section>

  <section>
    <h3>Notifications</h3>
    <label class="check">
      <input
        type="checkbox"
        checked={notifications.enabled}
        onchange={(event) => patchNotify({ enabled: event.currentTarget.checked })}
      />
      <span>Notifications de Photon</span>
      <small>L'avertissement avant un arrêt du PC part toujours</small>
    </label>
    <div class="field">
      <span class="line" aria-hidden="true">Style</span>
      {@render segmented(
        'Style des notifications',
        'notifyStyle',
        [
          ['photon', 'Photon'],
          ['windows', 'Windows']
        ],
        notifications.style,
        (id) => patchNotify({ style: id === 'windows' ? 'windows' : 'photon' })
      )}
      <small class="hint">
        {notifications.style === 'photon'
          ? 'Cartes de Photon en bas à droite. En jeu plein écran ou en Ne pas déranger, Windows prend le relais.'
          : 'Centre de notifications de Windows.'}
      </small>
    </div>
    {#if notifications.enabled}
      {#each notifySources as [source, [label, hint]] (source)}
        <label class="check">
          <input
            type="checkbox"
            checked={notifications.sources[source] !== false}
            onchange={(event) =>
              patchNotify({
                sources: { ...notifications.sources, [source]: event.currentTarget.checked }
              })}
          />
          <span>{label}</span>
          <small>{hint}</small>
        </label>
      {/each}
    {/if}
    <button type="button" class="action" onclick={() => window.photon.notifyTest()}>
      Envoyer une notification d'essai
    </button>
  </section>
</div>

<style>
  /* Tiroir de verre à droite. no-drag : en mode fenêtre il recouvre la barre qui déplace la fenêtre. */
  .settings {
    position: absolute;
    top: 12px;
    right: 12px;
    bottom: 12px;
    box-sizing: border-box;
    width: min(360px, calc(100% - 24px));
    padding: 20px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 24px;
    border: 1px solid var(--glass-edge);
    border-radius: var(--radius);
    background: var(--glass-sheen), var(--drawer-bg);
    backdrop-filter: var(--glass-filter-drawer);
    box-shadow: var(--shadow-popover);
    -webkit-app-region: no-drag;
    animation: open var(--dur-reveal) var(--ease-out);
  }

  @keyframes open {
    from {
      opacity: 0;
      transform: translateX(16px);
    }
  }

  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  h2 {
    margin: 0;
    font-size: var(--text-18);
    font-weight: var(--weight-semibold);
    letter-spacing: var(--tracking-title);
  }

  section {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  h3 {
    margin: 0;
    font-size: var(--text-12);
    font-weight: var(--weight-semibold);
    text-transform: uppercase;
    letter-spacing: var(--tracking-label);
    color: var(--text-faint);
  }

  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px 16px;
    min-width: 0;
  }

  .file {
    min-width: 0;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text-muted);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .line {
    display: flex;
    justify-content: space-between;
    font-size: var(--text-13);
  }

  .value {
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }

  /* Boutons radio en pastilles : l'input couvre la case (clavier, clic), le texte est dessous. */
  .seg {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 1fr;
    gap: 2px;
    min-width: 0;
    margin: 0;
    padding: 3px;
    border: 1px solid var(--line);
    border-radius: var(--radius-pill);
    background: var(--white-4);
  }

  .seg label {
    position: relative;
    display: flex;
  }

  .seg input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    border-radius: var(--radius-pill);
    opacity: 0;
    cursor: pointer;
  }

  .seg span {
    flex: 1;
    display: grid;
    place-items: center;
    min-height: 32px;
    padding: 4px 10px;
    border-radius: var(--radius-pill);
    font-size: var(--text-13);
    font-weight: var(--weight-medium);
    line-height: 1.2;
    text-align: center;
    text-wrap: balance;
    color: var(--text-muted);
  }

  .seg input:not(:checked):hover + span {
    color: var(--text);
    background: var(--white-6);
  }

  .seg input:checked + span {
    background: var(--accent);
    color: var(--on-accent);
  }

  input[type='range'] {
    appearance: none;
    width: 100%;
    height: 20px;
    margin: 0;
    background: transparent;
    cursor: pointer;
  }

  input[type='range']::-webkit-slider-runnable-track {
    height: 4px;
    border-radius: 2px;
    background: linear-gradient(to right, var(--accent) var(--fill), var(--white-18) var(--fill));
  }

  input[type='range']::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 16px;
    margin-top: -6px;
    border: 0;
    border-radius: 50%;
    background: var(--white);
    box-shadow:
      0 0 0 3px color-mix(in srgb, var(--accent) 40%, transparent),
      var(--shadow-thumb);
    transition: transform var(--dur-fast) var(--ease-out);
  }

  input[type='range']:active::-webkit-slider-thumb {
    transform: scale(1.15);
  }

  .swatch {
    width: 28px;
    height: 28px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: var(--c);
    box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.25);
    cursor: pointer;
    transition: transform var(--dur-fast) var(--ease-out);
  }

  .swatch:hover {
    transform: scale(1.12);
  }

  .swatch[aria-pressed='true'] {
    box-shadow:
      inset 0 0 0 1px rgb(255 255 255 / 0.25),
      0 0 0 2px var(--surface-ring),
      0 0 0 4px var(--text);
  }

  .color {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: var(--text-13);
    color: var(--text-muted);
    cursor: pointer;
  }

  .color input {
    appearance: none;
    width: 28px;
    height: 28px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: none;
    cursor: pointer;
  }

  .color input::-webkit-color-swatch-wrapper {
    padding: 0;
  }

  .color input::-webkit-color-swatch {
    border: 0;
    border-radius: 50%;
    box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.25);
  }

  /* Ambiances : cartes radio sur deux colonnes, la choisie prend l'accent. */
  .presets {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    min-width: 0;
    margin: 0;
    padding: 0;
    border: 0;
  }

  .presets legend {
    margin-bottom: 8px;
    padding: 0;
    font-size: var(--text-13);
  }

  .presets label {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 10px 12px;
    border: 1px solid var(--line);
    border-radius: var(--radius-row);
    background: var(--white-4);
    cursor: pointer;
    transition: background var(--dur-hover) var(--ease-out);
  }

  .presets label:hover {
    background: var(--white-6);
  }

  .presets label:has(input:checked) {
    border-color: var(--border-accent-soft);
    background: var(--surface-accent-soft);
  }

  .presets label:has(input:focus-visible) {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  .presets input {
    position: absolute;
    inset: 0;
    margin: 0;
    opacity: 0;
    cursor: pointer;
  }

  .presets span {
    font-size: var(--text-13);
    font-weight: var(--weight-semibold);
  }

  .presets label:has(input:checked) span {
    color: var(--accent);
  }

  .presets small {
    color: var(--text-faint);
    font-size: var(--text-12);
    line-height: 1.35;
  }

  .check {
    display: grid;
    grid-template-columns: 18px 1fr;
    align-items: center;
    gap: 2px 10px;
    font-size: var(--text-13);
    cursor: pointer;
  }

  .check input {
    margin: 0;
    accent-color: var(--accent);
    cursor: inherit;
  }

  .check small {
    grid-column: 2;
    color: var(--text-faint);
    font-size: var(--text-12);
  }

  .field small {
    color: var(--text-faint);
    font-size: var(--text-12);
  }

  .check:has(input:disabled) {
    cursor: default;
    opacity: 0.6;
  }

  select {
    min-height: 36px;
    padding: 0 10px;
    border: 1px solid var(--line);
    border-radius: var(--radius-row);
    background: var(--white-6);
    color: var(--text);
    font: inherit;
    font-size: var(--text-13);
    cursor: pointer;
  }

  select option {
    background: var(--surface-option);
    color: var(--text);
  }
</style>
