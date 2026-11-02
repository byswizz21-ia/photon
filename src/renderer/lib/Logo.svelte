<script lang="ts">
  // Logo « photon en orbite » : traînée de lumière (conic masqué en anneau) + point à cœur blanc
  // et halo. transform / opacity seulement. idle : le halo respire, un tour toutes les 10 s ;
  // survol : un tour en ressort ; thinking : rotation continue. 20 px et moins : dessin simplifié.
  import { app } from '../state.svelte'

  type Mode = 'idle' | 'thinking' | 'still'

  let {
    size = 28,
    ink = 'currentColor',
    mode = 'idle',
    hover = true
  }: { size?: number; ink?: string; mode?: Mode; hover?: boolean } = $props()

  const small = $derived(size <= 20)

  // Survol : on relance l'orbite (bloc {#key}) pour un tour, puis retour au repos.
  let spin = $state(0)
  let spinning = $state(false)
  let timer: ReturnType<typeof setTimeout> | undefined

  function onenter(): void {
    if (!hover || small || mode !== 'idle' || spinning) return
    spinning = true
    spin++
    clearTimeout(timer)
    timer = setTimeout(() => (spinning = false), 1100)
  }

  $effect(() => () => clearTimeout(timer))
</script>

<span
  class="logo"
  class:small
  class:paused={!app.visible}
  style:--k={size / 64}
  style:--ink={ink}
  style:width="{size}px"
  style:height="{size}px"
  onpointerenter={onenter}
  aria-hidden="true"
>
  {#if !small}<span class="ghost" class:lit={mode === 'thinking'}></span>{/if}
  {#key spin}
    <span
      class="orbit"
      class:idle={mode === 'idle' && !spinning}
      class:spin={spinning}
      class:thinking={mode === 'thinking'}
    >
      <span class="trail"></span>
      {#if !small}<span class="halo"></span>{/if}
      <span class="dot"></span>
    </span>
  {/key}
</span>

<style>
  /* Repère : viewBox 64 ; --k = taille / 64. Orbite r = 20 centrée, point à 45° (46.14, 17.86). */
  .logo {
    --t: calc(3.5px * var(--k));
    --r: calc(7px * var(--k));
    position: relative;
    display: inline-block;
    flex: none;
  }

  .logo.small {
    --t: calc(6.5px * var(--k));
    --r: calc(9.5px * var(--k));
  }

  .paused * {
    animation-play-state: paused !important;
  }

  .ghost {
    position: absolute;
    left: calc(12px * var(--k) - 0.5px);
    top: calc(12px * var(--k) - 0.5px);
    width: calc(40px * var(--k) + 1px);
    height: calc(40px * var(--k) + 1px);
    box-sizing: border-box;
    border-radius: 50%;
    border: max(1px, calc(0.8px * var(--k))) solid color-mix(in srgb, var(--ink) 7%, transparent);
  }

  .ghost.lit {
    border-color: color-mix(in srgb, var(--ink) 16%, transparent);
  }

  .orbit {
    position: absolute;
    inset: 0;
    will-change: transform;
  }

  .orbit.idle {
    animation: cycle var(--dur-logo-cycle) infinite;
  }

  .orbit.spin {
    animation: turn 1100ms var(--ease-spring);
  }

  .orbit.thinking {
    animation: turn var(--dur-logo-turn) linear infinite;
  }

  /* Traînée : s'allume en approchant du point, finit en accent ; 30° de vide derrière le point. */
  .trail {
    position: absolute;
    left: calc(12px * var(--k) - var(--t) / 2);
    top: calc(12px * var(--k) - var(--t) / 2);
    width: calc(40px * var(--k) + var(--t));
    height: calc(40px * var(--k) + var(--t));
    border-radius: 50%;
    background: conic-gradient(
      from 75deg,
      transparent 0deg,
      color-mix(in srgb, var(--ink) 10%, transparent) 110deg,
      color-mix(in srgb, var(--ink) 52%, transparent) 245deg,
      color-mix(in srgb, var(--accent) 95%, transparent) 312deg,
      var(--accent) 330deg,
      transparent 330deg
    );
    mask: radial-gradient(
      closest-side,
      transparent calc(100% - var(--t)),
      #000 calc(100% - var(--t) + 0.6px),
      #000 calc(100% - 0.6px),
      transparent 100%
    );
  }

  .small .trail {
    background: conic-gradient(
      from 75deg,
      color-mix(in srgb, var(--ink) 30%, transparent) 0deg,
      color-mix(in srgb, var(--ink) 75%, transparent) 210deg,
      var(--accent) 320deg,
      var(--accent) 330deg,
      transparent 330deg
    );
  }

  .halo {
    position: absolute;
    left: calc(28.14px * var(--k));
    top: calc(-0.14px * var(--k));
    width: calc(36px * var(--k));
    height: calc(36px * var(--k));
    border-radius: 50%;
    background: radial-gradient(
      circle,
      color-mix(in srgb, var(--accent) 70%, transparent) 0%,
      color-mix(in srgb, var(--accent) 22%, transparent) 36%,
      transparent 68%
    );
    animation: breathe var(--dur-logo-breathe) ease-in-out infinite;
    will-change: transform, opacity;
  }

  .spin .halo {
    animation: flare var(--dur-logo-flare) ease-out;
  }

  .thinking .halo {
    animation-duration: var(--dur-logo-turn);
  }

  .dot {
    position: absolute;
    left: calc(46.14px * var(--k) - var(--r));
    top: calc(17.86px * var(--k) - var(--r));
    width: calc(2 * var(--r));
    height: calc(2 * var(--r));
    border-radius: 50%;
    background: radial-gradient(
      circle at 38% 36%,
      #fff 0%,
      color-mix(in srgb, var(--accent) 35%, #fff) 26%,
      var(--accent) 64%,
      color-mix(in srgb, var(--accent) 72%, #000) 100%
    );
    box-shadow:
      0 0 max(2px, calc(6.4px * var(--k))) color-mix(in srgb, var(--accent) 90%, transparent),
      0 0 max(6px, calc(19.2px * var(--k))) var(--border-accent-soft);
  }

  .small .dot {
    background: var(--accent);
    box-shadow: none;
  }

  /* Repos : immobile 8 s, puis un tour en 2 s. */
  @keyframes cycle {
    0%,
    80% {
      transform: rotate(0deg);
      animation-timing-function: cubic-bezier(0.6, 0, 0.2, 1);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  @keyframes turn {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes breathe {
    0%,
    100% {
      opacity: 0.5;
      transform: scale(0.85);
    }
    50% {
      opacity: 1;
      transform: scale(1.12);
    }
  }

  @keyframes flare {
    0% {
      opacity: 0.6;
      transform: scale(0.9);
    }
    25% {
      opacity: 1;
      transform: scale(1.6);
    }
    100% {
      opacity: 0.6;
      transform: scale(0.9);
    }
  }
</style>
