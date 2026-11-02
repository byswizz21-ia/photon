<script lang="ts">
  // Calques de l'animation d'ouverture (timeline : timeline.svelte.ts). back : fond, point, anneau
  // et lueurs, sous le verre ; glass : reflet qui traverse le panneau ; front : nom, « Bienvenue »,
  // raccourci. Le calque front capte clic et touche pour passer l'intro.
  import { untrack } from 'svelte'
  import { shortcutLabel } from '../../shared/model'
  import { app } from '../state.svelte'
  import { endIntro, intro, runIntro } from './timeline.svelte'

  let { layer }: { layer: 'back' | 'glass' | 'front' } = $props()

  const LETTERS = [...'Photon']
  const fullscreen = $derived(app.settings.mode === 'fullscreen')
  const keys = $derived(shortcutLabel(app.settings.shortcut).split('+'))

  function skip(event: Event): void {
    event.preventDefault()
    event.stopPropagation()
    endIntro()
  }

  // Touche seule (Win, Alt… encore tenues après le raccourci) ou répétée : pas un « passer ».
  function onKey(event: KeyboardEvent): void {
    if (!event.repeat && !['Meta', 'Alt', 'Control', 'Shift', 'OS'].includes(event.key)) skip(event)
  }

  // Touches captées avant le reste de l'app (barre de commande, Échap qui cache Photon).
  function start(node: HTMLElement): () => void {
    window.addEventListener('keydown', onKey, true)
    const root = node.closest<HTMLElement>('.root')
    // untrack : un réglage reçu pendant l'intro ne la relance pas.
    untrack(() => (root ? runIntro(root) : endIntro()))
    return () => window.removeEventListener('keydown', onKey, true)
  }
</script>

{#if layer === 'back'}
  <div class="layer back" class:full={fullscreen} data-intro="back" aria-hidden="true">
    <span class="glow b" data-intro="glow-b"></span>
    <span class="glow a" data-intro="glow-a"></span>
    <span class="ring" data-intro="ring"></span>
    <span class="dot" data-intro="dot"></span>
  </div>
{:else if layer === 'glass'}
  <div class="layer" class:full={fullscreen} aria-hidden="true">
    <span class="sweep" data-intro="sweep"></span>
  </div>
{:else}
  <!-- Clic n'importe où : passer. Au clavier, n'importe quelle touche (onKey). -->
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="layer front" class:full={fullscreen} onclick={skip} {@attach start}>
    <div class="mark" data-intro="mark" role="img" aria-label="Photon">
      <span class="word" data-intro="word">
        {#each LETTERS as letter, i (i)}<span data-intro="letter">{letter}</span>{/each}
      </span>
    </div>
    <p class="welcome" data-intro="welcome">Bienvenue</p>
    <div
      class="hint"
      class:bubble={intro.hintTop === null}
      style:top={intro.hintTop === null ? null : `${intro.hintTop}px`}
      data-intro="hint"
    >
      <span class="keys">
        {#each keys as key, i (i)}
          {#if i > 0}<span class="plus">+</span>{/if}
          <kbd data-intro="key"><span class="lit"></span>{key}</kbd>
        {/each}
      </span>
      <span class="text">pour ouvrir Photon de n’importe où</span>
    </div>
  </div>
{/if}

<style>
  .layer {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
  }

  /* Mode fenêtre : sous le contenu du panneau mais sur son fond (le panneau est isolé). */
  .back:not(.full) {
    z-index: -1;
  }

  .back.full {
    background: var(--bg);
  }

  .dot,
  .ring,
  .glow {
    position: absolute;
    left: 50%;
    top: 50%;
    border-radius: 50%;
    opacity: 0;
  }

  .dot {
    width: 12px;
    height: 12px;
    margin: -6px 0 0 -6px;
    background: radial-gradient(circle, var(--white) 0 30%, var(--accent) 70%);
    box-shadow:
      0 0 18px 4px var(--accent),
      0 0 70px 16px color-mix(in srgb, var(--accent) 55%, transparent);
  }

  .back:not(.full) .dot {
    width: 10px;
    height: 10px;
    margin: -5px 0 0 -5px;
    box-shadow:
      0 0 16px 4px var(--accent),
      0 0 56px 12px color-mix(in srgb, var(--accent) 55%, transparent);
  }

  /* Taille finale : il grandit par transform (scale) depuis 40 px. */
  .ring {
    box-sizing: border-box;
    width: 1540px;
    height: 1540px;
    margin: -770px 0 0 -770px;
    border: 1.5px solid var(--accent);
    box-shadow:
      0 0 40px color-mix(in srgb, var(--accent) 50%, transparent),
      inset 0 0 40px color-mix(in srgb, var(--accent) 30%, transparent);
  }

  .back:not(.full) .ring {
    width: 1130px;
    height: 1130px;
    margin: -565px 0 0 -565px;
    box-shadow:
      0 0 32px color-mix(in srgb, var(--accent) 50%, transparent),
      inset 0 0 32px color-mix(in srgb, var(--accent) 30%, transparent);
  }

  .glow {
    --tone: var(--accent);
    width: 1300px;
    height: 1300px;
    margin: -650px 0 0 -650px;
    background: radial-gradient(
      circle,
      color-mix(in srgb, var(--tone) 50%, transparent) 0%,
      color-mix(in srgb, var(--tone) 20%, transparent) 32%,
      transparent 68%
    );
  }

  .glow.b {
    --tone: var(--glow-secondary);
  }

  .back:not(.full) .glow {
    width: 900px;
    height: 900px;
    margin: -450px 0 0 -450px;
    background: radial-gradient(
      circle,
      color-mix(in srgb, var(--tone) 45%, transparent) 0%,
      color-mix(in srgb, var(--tone) 16%, transparent) 34%,
      transparent 68%
    );
  }

  .sweep {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 320px;
    background: linear-gradient(100deg, transparent, var(--white-7) 50%, transparent);
    transform: translateX(-100vw);
  }

  .full .sweep {
    width: 420px;
  }

  .front {
    pointer-events: auto;
    -webkit-app-region: no-drag;
    color: var(--text);
  }

  /* Centré par translate ; transform reste libre pour le trajet vers l'en-tête. */
  .mark {
    position: absolute;
    left: 50%;
    top: 50%;
    translate: -50% -50%;
    transform-origin: left center;
    font-size: var(--text-intro-window);
    font-weight: var(--weight-semibold);
    letter-spacing: var(--tracking-title);
    line-height: 1;
    white-space: nowrap;
  }

  .full .mark {
    top: 48%;
    font-size: var(--text-intro);
  }

  .word {
    display: flex;
  }

  .word span {
    display: inline-block;
    opacity: 0;
  }

  .welcome {
    position: absolute;
    left: 0;
    right: 0;
    top: calc(50% + 54px);
    margin: 0;
    text-align: center;
    font-size: var(--text-18);
    letter-spacing: 0.01em;
    color: var(--text-muted);
    opacity: 0;
  }

  .full .welcome {
    top: calc(48% + 78px);
    font-size: var(--text-intro-sub);
  }

  /* Plein écran : ligne centrée sous le panneau (top posé par l'intro). */
  .hint {
    position: absolute;
    left: 0;
    right: 0;
    translate: 0 -50%;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 14px;
    opacity: 0;
  }

  .keys {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  kbd {
    position: relative;
    isolation: isolate;
    box-sizing: border-box;
    min-width: 34px;
    height: 34px;
    padding: 0 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--glass-edge);
    border-radius: var(--radius-intro-key);
    background: var(--white-5);
    box-shadow: var(--glass-rim);
    font: inherit;
    font-size: var(--text-15);
    font-weight: var(--weight-medium);
    color: var(--text);
  }

  /* Touche appuyée : teinte et halo d'accent, allumés par l'opacité. */
  .lit {
    position: absolute;
    z-index: -1;
    inset: -1px;
    border-radius: inherit;
    background: color-mix(in srgb, var(--accent) 16%, transparent);
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, var(--accent) 55%, transparent),
      0 0 18px -4px color-mix(in srgb, var(--accent) 80%, transparent);
    opacity: 0;
  }

  .plus {
    font-size: var(--text-14);
    color: var(--text-faint);
  }

  .text {
    font-size: var(--text-16);
    color: var(--text-muted);
    white-space: nowrap;
  }

  /* Mode fenêtre (ou pas de place sous le panneau) : bulle de verre en bas. */
  .bubble {
    left: 50%;
    right: auto;
    top: auto;
    bottom: 20px;
    translate: -50% 0;
    gap: 12px;
    padding: 10px 16px 10px 10px;
    border: 1px solid var(--glass-edge);
    border-radius: var(--radius-popover);
    background: var(--glass-sheen), var(--popover-bg);
    box-shadow: var(--shadow-popover);
    backdrop-filter: var(--glass-filter);
  }

  .bubble .keys {
    gap: 6px;
  }

  .bubble kbd {
    min-width: 30px;
    height: 30px;
    padding: 0 10px;
    border-radius: calc(var(--radius-intro-key) - 1px);
    font-size: var(--text-14);
  }

  .bubble .plus {
    font-size: var(--text-13);
  }

  .bubble .text {
    font-size: var(--text-14);
  }
</style>
