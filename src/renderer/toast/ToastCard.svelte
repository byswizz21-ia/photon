<script lang="ts">
  // Une notification : carte de verre fumé, lumière d'accent, icône de la source (ou pochette),
  // boutons d'action et fine barre qui se vide (pause au survol). Un rappel reste sans barre.
  import BellIcon from 'phosphor-svelte/lib/BellIcon'
  import BriefcaseIcon from 'phosphor-svelte/lib/BriefcaseIcon'
  import CalendarDotsIcon from 'phosphor-svelte/lib/CalendarDotsIcon'
  import EyeIcon from 'phosphor-svelte/lib/EyeIcon'
  import HourglassIcon from 'phosphor-svelte/lib/HourglassIcon'
  import MusicNotesIcon from 'phosphor-svelte/lib/MusicNotesIcon'
  import PowerIcon from 'phosphor-svelte/lib/PowerIcon'
  import SparkleIcon from 'phosphor-svelte/lib/SparkleIcon'
  import TimerIcon from 'phosphor-svelte/lib/TimerIcon'
  import UserSwitchIcon from 'phosphor-svelte/lib/UserSwitchIcon'
  import XIcon from 'phosphor-svelte/lib/XIcon'
  import type { Toast } from '../../shared/api'
  import { NOTIFY_SOURCES } from '../../shared/model'

  let {
    toast,
    leaving,
    onclose,
    onaction,
    ongone
  }: {
    toast: Toast
    leaving: boolean
    onclose: () => void
    onaction: (action: number) => void // -1 : la carte elle-même
    ongone: () => void // sortie terminée
  } = $props()

  // Mêmes icônes que les widgets d'où viennent les notifications.
  const ICONS = {
    calendar: CalendarDotsIcon,
    countdown: HourglassIcon,
    micro: BriefcaseIcon,
    timetrack: HourglassIcon,
    pomodoro: TimerIcon,
    eyes: EyeIcon,
    claude: SparkleIcon,
    music: MusicNotesIcon,
    profiles: UserSwitchIcon,
    always: PowerIcon
  } as Record<string, typeof BellIcon>

  const LABELS: Record<string, string> = { always: 'Arrêt du PC', test: 'Photon' }

  const Icon = $derived(ICONS[toast.source] ?? BellIcon)
  const label = $derived(
    LABELS[toast.source] ??
      NOTIFY_SOURCES[toast.source as keyof typeof NOTIFY_SOURCES]?.[0] ??
      'Photon'
  )
  const duration = $derived(toast.actions.length > 0 ? 8000 : 6000) // ms à l'écran sans survol
  // Heure d'arrivée, figée (un rappel peut rester longtemps à l'écran).
  const time = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format()
</script>

<div
  class="card"
  class:leaving
  class:sticky={toast.sticky}
  role="status"
  onanimationend={(event) => leaving && event.target === event.currentTarget && ongone()}
>
  <span class="edge" aria-hidden="true"></span>
  <span class="sweep" aria-hidden="true"><span></span></span>
  <button type="button" class="hit" aria-label="Ouvrir" onclick={() => onaction(-1)}></button>

  {#if toast.image}
    <img class="art" src={toast.image} alt="" />
  {:else}
    <span class="icon" aria-hidden="true"><Icon size={22} weight="duotone" /></span>
  {/if}

  <div class="content">
    <div class="meta">
      <span class="source">{label}</span>
      <span class="dot">·</span>
      <span>{time}</span>
    </div>
    <p class="title">{toast.title}</p>
    {#if toast.body}<p class="body">{toast.body}</p>{/if}
    {#if toast.actions.length > 0}
      <div class="actions">
        {#each toast.actions as action, index (index)}
          <button type="button" class:primary={index === 0} onclick={() => onaction(index)}>
            {action}
          </button>
        {/each}
      </div>
    {/if}
  </div>

  <button type="button" class="close" aria-label="Fermer" onclick={onclose}>
    <XIcon size={12} weight="bold" />
  </button>

  {#if !toast.sticky}
    <span
      class="bar"
      style:animation-duration="{duration}ms"
      onanimationend={(event) => event.target === event.currentTarget && onclose()}
    ></span>
  {/if}
</div>

<style>
  .card {
    position: relative;
    width: 360px;
    box-sizing: border-box;
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 14px;
    padding: 16px 18px 18px 16px;
    border-radius: var(--radius-popover);
    /* Rien à flouter derrière une fenêtre transparente : verre presque opaque, comme les
       menus en mode fenêtre, avec la lumière d'accent et le grain du panneau. */
    background: var(--grain), var(--panel-light), var(--glass-sheen), var(--menu-bg-solid);
    box-shadow: var(--shadow-popover);
    color: var(--text);
    pointer-events: auto;
    cursor: default;
    transform-origin: 100% 50%;
    animation: enter var(--dur-spring-card) var(--ease-spring) both;
    transition: transform var(--dur-spring) var(--ease-spring);
  }

  /* Halo d'accent : un calque dont seule l'opacité change (survol, rappel). */
  .card::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    box-shadow: var(--glow-card); /* ombre externe : ne couvre jamais le contenu */
    pointer-events: none;
    opacity: 0.6;
    transition: opacity var(--dur-hover) var(--ease-out);
  }

  .card:hover {
    transform: translateY(var(--hover-lift));
  }

  .card:hover::after,
  .sticky::after {
    opacity: 1;
  }

  .card.leaving {
    animation: leave var(--dur-fade) var(--ease-out) both;
  }

  /* Bord en dégradé accent → violet, comme le panneau de Photon. */
  .edge {
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

  /* Reflet qui traverse le verre une fois, à l'arrivée. */
  .sweep {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    overflow: hidden;
    pointer-events: none;
  }

  .sweep span {
    position: absolute;
    inset: -20% auto -20% 0;
    width: 45%;
    background: var(--glass-sheen);
    transform: translateX(-120%) skewX(-18deg);
    opacity: 0;
    animation: sweep var(--dur-logo-flare) var(--ease-out) var(--dur-fast) both;
  }

  /* Toute la carte est cliquable ; texte et icône laissent passer le clic. */
  .hit {
    position: absolute;
    inset: 0;
    border: 0;
    border-radius: inherit;
    background: none;
    cursor: pointer;
  }

  .icon,
  .art,
  .content {
    position: relative;
    pointer-events: none;
  }

  .icon {
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    border: 1px solid var(--border-accent-soft);
    border-radius: var(--radius-icon);
    background: var(--surface-accent-soft);
    color: var(--accent);
    box-shadow: var(--glow-card);
  }

  /* Rappel : un anneau de lumière qui respire autour de l'icône. */
  .sticky .icon::after {
    content: '';
    position: absolute;
    inset: -1px;
    border: 1px solid var(--accent);
    border-radius: inherit;
    animation: ring var(--dur-pulse) var(--ease-out) infinite;
  }

  .art {
    width: 48px;
    height: 48px;
    border-radius: var(--radius-icon);
    object-fit: cover;
    box-shadow: var(--shadow-art);
  }

  .content {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .meta {
    display: flex;
    gap: 6px;
    padding-right: 22px; /* place de la croix */
    color: var(--text-label);
    font-size: var(--text-11);
    font-variant-numeric: tabular-nums;
  }

  .source {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--accent);
    font-weight: var(--weight-semibold);
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
  }

  p {
    margin: 0;
  }

  .title {
    font-size: var(--text-14);
    font-weight: var(--weight-semibold);
    letter-spacing: var(--tracking-title);
    line-height: 1.3;
    overflow-wrap: anywhere;
  }

  .body {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    overflow: hidden;
    color: var(--text-secondary);
    font-size: var(--text-13);
    line-height: 1.4;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 9px;
  }

  .actions button,
  .close {
    pointer-events: auto;
    border: 1px solid var(--line);
    border-radius: var(--radius-pill);
    background: var(--surface-control);
    cursor: pointer;
    transition: transform var(--dur-spring) var(--ease-spring);
  }

  .actions button {
    min-height: var(--control-h-pill);
    padding: 0 14px;
    font-size: var(--text-13);
    font-weight: var(--weight-medium);
  }

  .actions button:hover,
  .close:hover {
    background: var(--white-12);
  }

  .actions .primary {
    border-color: transparent;
    background: var(--accent);
    color: var(--on-accent);
    box-shadow: var(--glow-dot);
  }

  .actions .primary:hover {
    background: var(--accent);
  }

  .actions button:active,
  .close:active {
    transform: scale(var(--press-scale));
    transition-duration: var(--dur-press);
  }

  .close {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 24px;
    height: 24px;
    display: grid;
    place-items: center;
    padding: 0;
    color: var(--text-muted);
    opacity: 0;
    transition:
      opacity var(--dur-fast) var(--ease-out),
      transform var(--dur-spring) var(--ease-spring);
  }

  .card:hover .close,
  .close:focus-visible {
    opacity: 1;
  }

  .close:hover {
    color: var(--text);
  }

  /* Temps restant : la barre se vide de droite à gauche, en pause tant que la souris est sur
     la pile. Sa fin ferme la carte. */
  .bar {
    position: absolute;
    right: 18px;
    bottom: 0;
    left: 18px;
    height: 2px;
    border-radius: var(--radius-bar);
    background: var(--accent);
    box-shadow: var(--glow-bar);
    opacity: 0.8;
    transform-origin: 0 50%;
    animation-name: drain;
    animation-timing-function: linear;
    animation-fill-mode: both;
  }

  :global(.stack:hover) .bar {
    animation-play-state: paused;
  }

  /* Réduire les animations : apparition et sortie instantanées, la barre continue. */
  :global(.still) .card,
  :global(.still) .sweep span,
  :global(.still) .sticky .icon::after {
    animation: none;
  }

  @keyframes enter {
    from {
      opacity: 0;
      transform: translateX(calc(100% + 24px)) scale(0.96);
    }
    40% {
      opacity: 1;
    }
  }

  @keyframes leave {
    to {
      opacity: 0;
      transform: translateX(48px) scale(0.96);
    }
  }

  @keyframes sweep {
    15% {
      opacity: 1;
    }
    to {
      opacity: 0;
      transform: translateX(260%) skewX(-18deg);
    }
  }

  @keyframes ring {
    from {
      opacity: 0.7;
      transform: scale(1);
    }
    to {
      opacity: 0;
      transform: scale(1.35);
    }
  }

  @keyframes drain {
    from {
      transform: scaleX(1);
    }
    to {
      transform: scaleX(0);
    }
  }
</style>
