<script lang="ts">
  // Coque du widget : niveau (anneau d'expérience), série de jours, onglets, puis l'onglet actif.
  // Les briques communes aux onglets (boutons, panneaux, chargement) sont stylées ici (b-…).
  import BarbellIcon from 'phosphor-svelte/lib/BarbellIcon'
  import BrainIcon from 'phosphor-svelte/lib/BrainIcon'
  import FlameIcon from 'phosphor-svelte/lib/FlameIcon'
  import PathIcon from 'phosphor-svelte/lib/PathIcon'
  import { pollWhileVisible } from '../../lib/poll.svelte'
  import { shared } from '../../lib/shared.svelte'
  import { streak } from '../habits/habits'
  import type { WidgetProps } from '../types'
  import Coach from './Coach.svelte'
  import { activeDays, level, parseBrain, xp } from './data'
  import Gym from './Gym.svelte'
  import type { BrainSettings, BrainTab } from './manifest'
  import Memory from './Memory.svelte'

  let { settings, save, preview }: WidgetProps<BrainSettings> = $props()

  const brain = shared('brain', parseBrain)

  // « Aujourd'hui » et les chances de rappel avancent sans rouvrir Photon.
  let now = $state(new Date())
  pollWhileVisible(() => (now = new Date()), 60_000)

  const TABS = [
    { id: 'memory', label: 'Mémoire', icon: BrainIcon },
    { id: 'gym', label: 'Entraînement', icon: BarbellIcon },
    { id: 'coach', label: 'Coach', icon: PathIcon }
  ] as const

  // Onglet choisi : gardé dans le profil, sauf dans l'aperçu du catalogue.
  let local = $state<BrainTab | null>(null)
  const tab = $derived(local ?? settings.tab)
  let reviewDeck = $state<string | null>(null) // le coach envoie réviser un paquet

  function go(next: BrainTab): void {
    local = next
    if (!preview && next !== settings.tab) save({ ...settings, tab: next })
  }

  function reviewFrom(deck: string): void {
    reviewDeck = deck
    go('memory')
  }

  const points = $derived(xp(brain.value))
  const lvl = $derived(level(points))
  const days = $derived(streak(activeDays(brain.value), now))
  const RING = 2 * Math.PI * 15 // périmètre de l'anneau d'expérience
</script>

<div class="brain">
  <header>
    <div class="who">
      <span class="ring" title="{points} XP">
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <circle class="track" cx="18" cy="18" r="15" />
          <circle
            class="fill"
            cx="18"
            cy="18"
            r="15"
            stroke-dasharray={RING}
            stroke-dashoffset={RING * (1 - lvl.progress)}
          />
        </svg>
        <b>{lvl.level}</b>
      </span>
      <span class="name">
        <span class="w-label">Cerveau</span>
        <span class="sub">Niveau {lvl.level} · {points} XP</span>
      </span>
      {#if days > 0}
        <span class="streak" title="Jours d'affilée avec une révision ou un entraînement">
          <FlameIcon size={14} weight="fill" />{days}
        </span>
      {/if}
    </div>
    <nav aria-label="Onglets du Cerveau">
      {#each TABS as t (t.id)}
        <button
          type="button"
          class:on={tab === t.id}
          aria-pressed={tab === t.id}
          title={t.label}
          onclick={() => go(t.id)}
        >
          <t.icon size={15} weight={tab === t.id ? 'fill' : 'regular'} />
          <span>{t.label}</span>
        </button>
      {/each}
    </nav>
  </header>

  <div class="page">
    {#if tab === 'memory'}
      <Memory {brain} {now} {preview} bind:reviewDeck />
    {:else if tab === 'gym'}
      <Gym {brain} {now} {preview} />
    {:else}
      <Coach {brain} {now} {preview} onreview={reviewFrom} />
    {/if}
  </div>
</div>

<style>
  .brain {
    box-sizing: border-box;
    height: 100%;
    padding: clamp(14px, 4cqmin, 22px);
    display: flex;
    flex-direction: column;
    gap: 14px;
    overflow: hidden;
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  .who {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .ring {
    position: relative;
    flex: none;
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
  }

  .ring svg {
    position: absolute;
    inset: 0;
    transform: rotate(-90deg);
  }

  .ring circle {
    fill: none;
    stroke-width: 3;
  }

  .track {
    stroke: var(--white-8);
  }

  .fill {
    stroke: var(--accent);
    stroke-linecap: round;
    filter: drop-shadow(0 0 4px var(--accent));
  }

  .ring b {
    font-size: var(--text-13);
    font-weight: var(--weight-semibold);
    font-variant-numeric: tabular-nums;
  }

  .name {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .sub {
    font-size: var(--text-12);
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .streak {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    height: var(--control-h-chip);
    padding: 0 9px;
    border-radius: var(--radius-pill);
    background: color-mix(in srgb, var(--accent-orange) 14%, transparent);
    color: var(--accent-orange);
    font-size: var(--text-12);
    font-weight: var(--weight-semibold);
    font-variant-numeric: tabular-nums;
  }

  nav {
    display: flex;
    gap: 2px;
    padding: 3px;
    border-radius: var(--radius-pill);
    background: var(--black-20);
    box-shadow: inset 0 0 0 1px var(--line);
  }

  nav button {
    height: var(--control-h-chip);
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 0 12px;
    border: 0;
    border-radius: var(--radius-pill);
    background: none;
    color: var(--text-muted);
    font-size: var(--text-12);
    font-weight: var(--weight-medium);
    cursor: pointer;
    transition: transform var(--dur-spring) var(--ease-spring);
  }

  nav button:hover {
    color: var(--text);
  }

  nav button:active {
    transform: scale(var(--press-scale));
  }

  nav button.on {
    background: var(--surface-accent-soft);
    color: var(--accent);
    box-shadow: inset 0 0 0 1px var(--border-accent-soft);
  }

  .page {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  /* Carte étroite : onglets en icônes seules. */
  @container (max-width: 470px) {
    nav span {
      display: none;
    }

    nav button {
      padding: 0 10px;
    }
  }

  /* --- Briques communes des onglets --- */

  .brain :global(.b-primary),
  .brain :global(.b-ghost) {
    min-height: var(--control-h-pill);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 0 14px;
    border-radius: var(--radius-pill);
    font-size: var(--text-13);
    font-weight: var(--weight-medium);
    white-space: nowrap;
    cursor: pointer;
    transition: transform var(--dur-spring) var(--ease-spring);
  }

  .brain :global(.b-primary) {
    border: 0;
    background: var(--accent);
    color: var(--on-accent);
    box-shadow: var(--glow-dot);
  }

  .brain :global(.b-ghost) {
    border: 1px solid var(--line);
    background: var(--surface-control);
    color: var(--text);
  }

  .brain :global(.b-ghost:hover) {
    background: var(--white-12);
  }

  .brain :global(.b-primary:active),
  .brain :global(.b-ghost:active) {
    transform: scale(var(--press-scale));
    transition-duration: var(--dur-press);
  }

  .brain :global(.b-primary:disabled),
  .brain :global(.b-ghost:disabled) {
    opacity: 0.45;
    cursor: default;
    transform: none;
  }

  /* Panneau posé dans la carte : un cran plus clair que le verre. */
  .brain :global(.b-panel) {
    border: 1px solid var(--line);
    border-radius: var(--radius-tile);
    background: var(--white-4);
  }

  .brain :global(.b-scroll) {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding-right: 4px;
    margin-right: -4px;
  }

  .brain :global(.b-title) {
    margin: 0;
    font-size: var(--text-15);
    font-weight: var(--weight-semibold);
    letter-spacing: var(--tracking-title);
    text-wrap: balance;
  }

  .brain :global(.b-text) {
    margin: 0;
    font-size: var(--text-13);
    line-height: 1.55;
    color: var(--text-secondary);
    white-space: pre-line;
  }

  .brain :global(.b-error) {
    margin: 0;
    font-size: var(--text-12);
    color: var(--danger-text);
  }

  .brain :global(.b-back) {
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 0;
    border: 0;
    background: none;
    color: var(--text-muted);
    font-size: var(--text-12);
    cursor: pointer;
  }

  .brain :global(.b-back:hover) {
    color: var(--text);
  }

  /* Claude travaille : reflet qui passe sur des lignes fantômes. */
  .brain :global(.b-loading) {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 18px;
  }

  .brain :global(.b-loading i) {
    position: relative;
    display: block;
    height: 10px;
    border-radius: var(--radius-bar);
    background: var(--white-6);
    overflow: hidden;
  }

  .brain :global(.b-loading i::after) {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      transparent,
      color-mix(in srgb, var(--accent) 30%, transparent),
      transparent
    );
    transform: translateX(-100%);
    animation: b-shine var(--dur-shine) var(--ease-glide) infinite;
  }

  .brain :global(.b-loading i:nth-child(2)) {
    width: 85%;
  }

  .brain :global(.b-loading i:nth-child(3)) {
    width: 60%;
  }

  @keyframes -global-b-shine {
    to {
      transform: translateX(100%);
    }
  }

  .brain :global(.b-score) {
    font-size: var(--text-display-s);
    font-weight: var(--weight-light);
    letter-spacing: var(--tracking-display);
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }
</style>
