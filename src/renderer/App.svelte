<script lang="ts">
  import CheckIcon from 'phosphor-svelte/lib/CheckIcon'
  import GearSixIcon from 'phosphor-svelte/lib/GearSixIcon'
  import PencilSimpleIcon from 'phosphor-svelte/lib/PencilSimpleIcon'
  import CommandBar from './bar/CommandBar.svelte'
  import AddMenu from './grid/AddMenu.svelte'
  import Catalog from './grid/Catalog.svelte'
  import Grid, { cellAt } from './grid/Grid.svelte'
  import Intro from './intro/Intro.svelte'
  import { endIntro, intro, startIntro } from './intro/timeline.svelte'
  import Logo from './lib/Logo.svelte'
  import { flushShared } from './lib/shared.svelte'
  import Profiles from './profiles/Profiles.svelte'
  import { reveal } from './reveal'
  import { clickSound, play, preloadSounds, soundOnChange } from './sound.svelte'
  import {
    app,
    flushProfile,
    flushTheme,
    receiveSettings,
    reducedMotion,
    switchProfile
  } from './state.svelte'
  import { useTheme } from './theme/apply.svelte'
  import Background from './theme/Background.svelte'
  import LiveBackdrop from './theme/LiveBackdrop.svelte'
  import SettingsPanel from './theme/SettingsPanel.svelte'
  import type { Placement } from '../shared/api'

  let root: HTMLElement
  let gear = $state<HTMLButtonElement>()
  let addMenu = $state<AddMenu>()
  let settingsOpen = $state(false)
  let catalogOpen = $state(false)
  let pressedVoid = false // le clic a commencé dans le vide (sinon : curseur glissé hors d'un contrôle)
  let claudeBusy = $state(false) // le logo tourne en continu pendant une réponse de Claude
  let place = $state<Placement | null>(null) // écran sous la fenêtre (flou réglable)
  const display = $derived(place?.id ?? 0) // ne change qu'en passant d'un écran à l'autre

  useTheme()
  $effect(() => preloadSounds(app.settings.sound.preset))

  const fullscreen = $derived(app.settings.mode === 'fullscreen')
  const liveBlur = $derived(!fullscreen && app.settings.liveBlur)

  $effect(() => {
    const offShow = window.photon.onShow(({ origin, mini }) => {
      app.visible = true
      app.mini = mini
      play('open')
      // Toute première ouverture : l'intro remplace la révélation habituelle.
      const first = !mini && !app.settings.introSeen && startIntro()
      if (!first && !reducedMotion()) reveal(root, origin)
      // Mesure : deux images après l'affichage ≈ fenêtre réellement à l'écran.
      requestAnimationFrame(() => requestAnimationFrame(() => window.photon.shown()))
    })
    const offHide = window.photon.onHide(() => {
      play('close')
      endIntro()
      app.visible = false
      app.editing = false
      settingsOpen = false
      catalogOpen = false
      flushProfile()
      flushTheme()
      flushShared()
    })
    const offSettings = window.photon.onSettings(receiveSettings)
    const offSkip = window.photon.onSkipIntro(endIntro) // raccourci global pendant l'intro
    const offSwitch = window.photon.onSwitchTo(switchProfile) // bascule auto
    const offPlace = window.photon.onPlace((next) => (place = next))
    window.photon.ready()
    return () => {
      offShow()
      offHide()
      offSettings()
      offSkip()
      offSwitch()
      offPlace()
    }
  })

  $effect(() => {
    let alive = true
    void window.photon.claudeState().then((state) => alive && (claudeBusy = state.busy))
    const off = window.photon.onClaude((state) => (claudeBusy = state.busy))
    return () => {
      alive = false
      off()
    }
  })

  soundOnChange(
    () => app.editing,
    (editing) => (editing ? 'editOn' : 'editOff')
  )
  soundOnChange(
    () => settingsOpen,
    (open) => (open ? 'panelOpen' : 'panelClose')
  )
  soundOnChange(
    () => app.settings.activeProfile,
    () => 'profile'
  )

  // « Réduire les animations » (Photon ou Windows) coupe toutes les transitions CSS.
  $effect(() => {
    document.documentElement.toggleAttribute('data-reduce-motion', reducedMotion())
  })

  // Réglages → « Revoir l'animation d'ouverture ».
  function replayIntro(): void {
    settingsOpen = false
    app.editing = false
    startIntro()
  }

  function closeSettings(): void {
    settingsOpen = false
    gear?.focus()
  }

  // Actions de la barre de commande sur l'interface.
  function runAction(id: string): void {
    if (id === 'ui:edit') {
      settingsOpen = false
      app.editing = true
    } else if (id === 'ui:settings') settingsOpen = true
    else if (id.startsWith('ui:profile:')) switchProfile(id.slice('ui:profile:'.length))
  }

  // Une lettre tapée hors d'un champ part dans la barre de commande : ouvrir Photon puis taper.
  function typeToSearch(event: KeyboardEvent): void {
    const target = event.target as HTMLElement
    const typing = target.closest('input, textarea, select, [contenteditable]')
    if (typing || app.editing || event.ctrlKey || event.altKey || event.metaKey) return
    if (event.key.length === 1)
      document.querySelector<HTMLInputElement>('[data-command-input]')?.focus()
  }

  // Ctrl+1…9 : profil n° 1 à 9, dans l'ordre des pastilles.
  function profileShortcut(event: KeyboardEvent): void {
    if (!event.ctrlKey || event.altKey || event.shiftKey || !/^[1-9]$/.test(event.key)) return
    const profile = app.profiles[Number(event.key) - 1]
    if (!profile) return
    event.preventDefault()
    switchProfile(profile.id)
  }

  // Échap : ferme d'abord le catalogue ou les réglages, puis quitte le mode édition, sinon ferme Photon.
  function onKeydown(event: KeyboardEvent): void {
    typeToSearch(event)
    profileShortcut(event)
    if (event.key !== 'Escape') return
    if (catalogOpen) catalogOpen = false
    else if (settingsOpen) closeSettings()
    else if (app.editing) app.editing = false
    else window.photon.hide('Échap')
  }

  const isVoid = (event: Event): boolean => (event.target as HTMLElement).hasAttribute('data-void')

  // Mode édition, clic droit dans un endroit libre du panneau : menu « Ajouter » sous la souris.
  function onContextMenu(event: MouseEvent): void {
    const target = event.target as HTMLElement
    if (!app.editing || target.closest('.grid-stack-item, header, .menu')) return
    event.preventDefault()
    addMenu?.openAt(event.clientX, event.clientY, cellAt(event.clientX, event.clientY))
  }

  // Clic dans le vide (fond, marges du panneau) : ferme les réglages, sinon Photon (plein écran, hors édition).
  function onClick(event: MouseEvent): void {
    if (!pressedVoid || !isVoid(event)) return
    if (settingsOpen) closeSettings()
    else if (fullscreen && !app.editing) window.photon.hide('clic dans le vide')
  }
</script>

<!-- Un fichier lâché hors d'un widget qui l'accepte ne fait rien (pas de navigation). -->
<svelte:window
  onkeydown={onKeydown}
  onclick={clickSound}
  ondragover={(event) => event.preventDefault()}
  ondrop={(event) => event.preventDefault()}
/>

<!-- Le clic dans le vide est un raccourci souris : au clavier, Échap ferme déjà. -->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div
  class="root"
  class:fullscreen={fullscreen && !app.mini}
  class:fill={fullscreen && !app.mini && app.theme.fill}
  class:mini={app.mini}
  style:--panel-width="{app.theme.panelWidth * 100}%"
  class:live={liveBlur}
  bind:this={root}
  onpointerdown={(event) => (pressedVoid = isVoid(event))}
  onclick={onClick}
  data-void
>
  {#if app.mini}
    <CommandBar mini onaction={runAction} />
  {:else}
    <div class="backdrop" aria-hidden="true">
      <!-- Plein écran seulement : en mode fenêtre, le flou acrylic de Windows fait le verre. -->
      {#if fullscreen}<Background />{/if}
      {#if liveBlur && app.visible && place}<LiveBackdrop {place} {display} />{/if}
      <div class="veil"></div>
    </div>
    <div class="light" aria-hidden="true"></div>
    {#if intro.playing && fullscreen}<Intro layer="back" />{/if}
    <!-- Clic droit = raccourci souris : le bouton « Ajouter » reste là au clavier. -->
    <main class="panel" class:intro={intro.playing} data-void oncontextmenu={onContextMenu}>
      {#if intro.playing && !fullscreen}<Intro layer="back" />{/if}
      <header class="bar" data-reveal class:drag={!fullscreen}>
        <Logo size={28} mode={claudeBusy ? 'thinking' : 'idle'} />
        <span class="name">Photon</span>
        <Profiles />
        <CommandBar onaction={runAction} />
        <div class="actions">
          {#if app.editing}
            <AddMenu bind:this={addMenu} oncatalog={() => (catalogOpen = true)} />
            <button type="button" class="action primary" onclick={() => (app.editing = false)}>
              <CheckIcon size={16} weight="bold" aria-hidden="true" />
              Terminé
            </button>
          {:else}
            <button
              type="button"
              class="action icon"
              aria-label="Modifier la grille"
              title="Modifier la grille"
              onclick={() => {
                settingsOpen = false
                app.editing = true
              }}
            >
              <PencilSimpleIcon size={18} weight="duotone" aria-hidden="true" />
            </button>
            <button
              type="button"
              class="action icon"
              bind:this={gear}
              aria-label="Réglages"
              title="Réglages"
              aria-haspopup="dialog"
              aria-expanded={settingsOpen}
              onclick={() => (settingsOpen = !settingsOpen)}
            >
              <GearSixIcon size={18} weight="duotone" aria-hidden="true" />
            </button>
          {/if}
        </div>
      </header>
      <!-- Nouvelle grille à chaque profil : gridstack repart de zéro, rien de l'ancien ne reste. -->
      {#key app.settings.activeProfile}<Grid />{/key}
      {#if intro.playing}<Intro layer="glass" />{/if}
    </main>
    {#if settingsOpen}<SettingsPanel onclose={closeSettings} onintro={replayIntro} />{/if}
    {#if catalogOpen}<Catalog onclose={() => (catalogOpen = false)} />{/if}
    {#if intro.playing}<Intro layer="front" />{/if}
  {/if}
</div>

<style>
  .root {
    position: relative;
    height: 100%;
    overflow: hidden;
  }

  /* Mode fenêtre : le flou de verre des menus et du tiroir n'agit pas (fenêtre transparente),
     les widgets se liraient au travers. Fonds presque opaques à la place. */
  .root:not(.fullscreen) {
    --menu-bg: var(--menu-bg-solid);
    --drawer-bg: var(--drawer-bg-solid);
  }

  /* Mini-mode : la fenêtre (verre acrylic de Windows) ne contient que la barre. */
  .root.mini {
    height: auto;
    background: var(--glass-sheen), var(--panel-bg);
  }

  /* Fond : calque flouté (plein écran), puis voile sombre et deux lueurs d'accent et violette. */
  .backdrop {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
  }

  .veil {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(
        circle at 12% 8%,
        color-mix(in srgb, var(--accent) 32%, transparent),
        transparent 45%
      ),
      radial-gradient(
        circle at 92% 96%,
        color-mix(in srgb, var(--glow-secondary) 32%, transparent),
        transparent 45%
      );
  }

  /* Fond net et assombri : c'est le panneau qui le floute, d'où l'effet de verre. */
  .fullscreen .veil {
    background-color: var(--veil-dark);
  }

  .light {
    position: absolute;
    left: 0;
    top: 0;
    width: 480px;
    height: 480px;
    margin: -240px 0 0 -240px;
    border-radius: 50%;
    background: radial-gradient(
      circle,
      color-mix(in srgb, var(--accent) 55%, transparent),
      transparent 65%
    );
    opacity: 0;
    pointer-events: none;
  }

  /* Mode fenêtre : le panneau est la fenêtre (Windows dessine coins, bordure et flou acrylic).
     Fumé lumineux : grain, lumière d'accent dans les coins, reflet du haut, teinte sombre. */
  .panel {
    position: relative;
    box-sizing: border-box;
    height: 100%;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    overflow: auto;
    border-radius: var(--radius-window); /* bordure en dégradé qui suit les coins de Windows */
    background: var(--grain), var(--panel-light), var(--panel-sheen), var(--panel-tint);
    box-shadow: var(--panel-rim);
  }

  /* Intro en mode fenêtre : ses lueurs passent entre le fond du panneau et son contenu. */
  .panel.intro {
    isolation: isolate;
  }

  /* Flou réglable (mode fenêtre) : le panneau floute la capture de l'écran posée derrière lui. */
  .live .panel {
    backdrop-filter: var(--panel-filter);
  }

  /* Bord en dégradé accent → violet : anneau de 1 px découpé par masque. */
  .panel::after {
    content: '';
    position: absolute;
    inset: 0;
    padding: 1px;
    border-radius: inherit;
    background: var(--panel-edge);
    mask:
      linear-gradient(#000 0 0) content-box,
      linear-gradient(#000 0 0);
    mask-composite: exclude;
    pointer-events: none;
  }

  /* Plein écran : panneau de verre centré, qui floute (et sature) le fond d'écran derrière lui. */
  .fullscreen .panel {
    width: min(var(--panel-width), calc(100% - 96px));
    height: auto;
    max-height: calc(100% - 96px);
    margin: 48px auto;
    border-radius: var(--radius-panel);
    backdrop-filter: var(--panel-filter);
    box-shadow: var(--panel-shadow);
  }

  /* Plein écran, option « Remplir l'écran » : plus de marge ni de coins, le verre va jusqu'aux bords. */
  .fill .panel {
    width: 100%;
    height: 100%;
    max-height: none;
    margin: 0;
    border-radius: 0;
  }

  /* Pas de liseré ni d'ombre collés aux bords de l'écran. */
  .fill .panel::after {
    display: none;
  }

  /* Claude en mode Bypass : halo rouge sur tout le panneau tant qu'il est actif. */
  .panel:has(:global([data-bypass])) {
    box-shadow: var(--halo-bypass);
  }

  .bar {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 36px;
  }

  /* Mode fenêtre : on déplace la fenêtre en tirant la barre du haut. */
  .drag {
    -webkit-app-region: drag;
  }

  .name {
    font-size: var(--text-18);
    font-weight: var(--weight-semibold);
    letter-spacing: var(--tracking-title);
  }

  /* Boutons de la barre : cliquables même dans la zone qui déplace la fenêtre. */
  .actions {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 8px;
    -webkit-app-region: no-drag;
  }
</style>
