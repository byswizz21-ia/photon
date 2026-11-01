<script lang="ts">
  import CheckIcon from 'phosphor-svelte/lib/CheckIcon'
  import GearSixIcon from 'phosphor-svelte/lib/GearSixIcon'
  import PencilSimpleIcon from 'phosphor-svelte/lib/PencilSimpleIcon'
  import AddMenu from './grid/AddMenu.svelte'
  import Grid from './grid/Grid.svelte'
  import Logo from './lib/Logo.svelte'
  import { reveal } from './reveal'
  import { app, flushProfile, flushTheme, reducedMotion } from './state.svelte'
  import { useTheme } from './theme/apply.svelte'
  import Background from './theme/Background.svelte'
  import SettingsPanel from './theme/SettingsPanel.svelte'

  let root: HTMLElement
  let gear = $state<HTMLButtonElement>()
  let settingsOpen = $state(false)
  let pressedVoid = false // le clic a commencé dans le vide (sinon : curseur glissé hors d'un contrôle)

  useTheme()

  const fullscreen = $derived(app.settings.mode === 'fullscreen')

  $effect(() => {
    const offShow = window.photon.onShow(({ origin }) => {
      app.visible = true
      if (!reducedMotion()) reveal(root, origin)
      // Mesure : deux images après l'affichage ≈ fenêtre réellement à l'écran.
      requestAnimationFrame(() => requestAnimationFrame(() => window.photon.shown()))
    })
    const offHide = window.photon.onHide(() => {
      app.visible = false
      app.editing = false
      settingsOpen = false
      flushProfile()
      flushTheme()
    })
    const offSettings = window.photon.onSettings((settings) => (app.settings = settings))
    window.photon.ready()
    return () => {
      offShow()
      offHide()
      offSettings()
    }
  })

  // « Réduire les animations » (Photon ou Windows) coupe toutes les transitions CSS.
  $effect(() => {
    document.documentElement.toggleAttribute('data-reduce-motion', reducedMotion())
  })

  function closeSettings(): void {
    settingsOpen = false
    gear?.focus()
  }

  // Échap : ferme d'abord les réglages, puis quitte le mode édition, sinon ferme Photon.
  function onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape') return
    if (settingsOpen) closeSettings()
    else if (app.editing) app.editing = false
    else window.photon.hide('Échap')
  }

  const isVoid = (event: Event): boolean => (event.target as HTMLElement).hasAttribute('data-void')

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
  ondragover={(event) => event.preventDefault()}
  ondrop={(event) => event.preventDefault()}
/>

<!-- Le clic dans le vide est un raccourci souris : au clavier, Échap ferme déjà. -->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div
  class="root"
  class:fullscreen
  bind:this={root}
  onpointerdown={(event) => (pressedVoid = isVoid(event))}
  onclick={onClick}
  data-void
>
  <div class="backdrop" aria-hidden="true">
    <!-- Plein écran seulement : en mode fenêtre, le flou acrylic de Windows fait le verre. -->
    {#if fullscreen}<Background />{/if}
    <div class="veil"></div>
  </div>
  <div class="light" aria-hidden="true"></div>
  <main class="panel" data-void>
    <header class="bar" data-reveal class:drag={!fullscreen}>
      <Logo size={28} />
      <span class="name">Photon</span>
      <div class="actions">
        {#if app.editing}
          <AddMenu />
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
    <Grid />
  </main>
  {#if settingsOpen}<SettingsPanel onclose={closeSettings} />{/if}
</div>

<style>
  .root {
    position: relative;
    height: 100%;
    overflow: hidden;
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
        color-mix(in srgb, var(--accent) 20%, transparent),
        transparent 45%
      ),
      radial-gradient(
        circle at 92% 96%,
        color-mix(in srgb, var(--glow-secondary) 20%, transparent),
        transparent 45%
      );
  }

  /* Fond net et juste assombri : c'est le panneau qui le floute, d'où l'effet de verre. */
  .fullscreen .veil {
    background-color: rgb(7 8 11 / 0.3);
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

  /* Mode fenêtre : le panneau est la fenêtre (Windows dessine coins et bordure). */
  .panel {
    position: relative;
    box-sizing: border-box;
    height: 100%;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    overflow: auto;
    background: var(--glass-sheen), var(--panel-bg);
  }

  /* Plein écran : panneau de verre centré, qui floute le fond d'écran derrière lui. */
  .fullscreen .panel {
    width: min(1280px, calc(100% - 96px));
    height: auto;
    max-height: calc(100% - 96px);
    margin: 48px auto;
    border: 1px solid var(--glass-edge);
    border-radius: var(--radius-panel);
    backdrop-filter: var(--glass-filter);
    box-shadow:
      var(--glass-rim),
      0 40px 100px -30px rgb(0 0 0 / 0.65);
  }

  /* Claude en mode Bypass : halo rouge sur tout le panneau tant qu'il est actif. */
  .panel:has(:global([data-bypass])) {
    box-shadow:
      inset 0 0 0 1px rgb(255 77 94 / 0.55),
      inset 0 0 120px -40px rgb(255 77 94 / 0.5);
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
    font-size: 18px;
    font-weight: 600;
    letter-spacing: -0.01em;
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
