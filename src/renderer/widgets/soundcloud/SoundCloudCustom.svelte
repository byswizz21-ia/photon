<script lang="ts">
  // SoundCloud, design « Adapté » : grande forme d'onde orange (partie lue, survol jusqu'au
  // curseur, clic = aller à ce moment), reflet sous l'onde, pochette et auteur, « J'aime ».
  // SoundCloud ne donne pas la vraie forme d'onde à Photon : elle est dessinée d'après le titre
  // (toujours la même pour un morceau). Pas de commentaires ni de compteurs (non lus).
  import ArrowSquareOutIcon from 'phosphor-svelte/lib/ArrowSquareOutIcon'
  import HeartIcon from 'phosphor-svelte/lib/HeartIcon'
  import MusicNotesIcon from 'phosphor-svelte/lib/MusicNotesIcon'
  import PauseIcon from 'phosphor-svelte/lib/PauseIcon'
  import PlayIcon from 'phosphor-svelte/lib/PlayIcon'
  import SkipBackIcon from 'phosphor-svelte/lib/SkipBackIcon'
  import SkipForwardIcon from 'phosphor-svelte/lib/SkipForwardIcon'
  import SoundcloudLogoIcon from 'phosphor-svelte/lib/SoundcloudLogoIcon'
  import type { MusicTrack } from '../../../shared/api'
  import { clock, ratioAt, type MusicSource } from '../../lib/music/source.svelte'

  let { source, track }: { source: MusicSource; track: MusicTrack } = $props()

  const BARS = 100

  // Forme d'onde en masque SVG : barres au-dessus de la ligne (69 %), reflet plus court dessous.
  function wave(seedText: string): string {
    let seed = 11
    for (const char of seedText) seed = (seed * 31 + char.charCodeAt(0)) % 2147483647
    const random = (): number => (seed = (seed * 16807) % 2147483647) / 2147483647
    let rects = ''
    for (let i = 0; i < BARS; i++) {
      const x = i / BARS
      // Enveloppe d'un morceau : intro, montée, refrain, pont, refrain, fin.
      const envelope =
        x < 0.1
          ? 0.25 + x * 2
          : x < 0.25
            ? 0.45 + (x - 0.1) * 1.4
            : x < 0.55
              ? 0.95
              : x < 0.64
                ? 0.38
                : x < 0.9
                  ? 0.9
                  : Math.max(0.15, 0.9 - (x - 0.9) * 7)
      const h = Math.max(0.07, envelope * (0.5 + 0.5 * random())) * 66
      rects += `<rect x="${i * 4}" y="${(66 - h).toFixed(1)}" width="2.8" height="${h.toFixed(1)}" rx="1"/>`
      rects += `<rect x="${i * 4}" y="68" width="2.8" height="${(h * 0.42).toFixed(1)}" rx="1"/>`
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BARS * 4} 96" preserveAspectRatio="none">${rects}</svg>`
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
  }
  const mask = $derived(wave(`${track.artist}\n${track.title}`))

  const progress = $derived(track.duration ? Math.min(1, track.time / track.duration) : 0)
  let hover = $state<number | null>(null)
  const seek = (event: MouseEvent): void => {
    if (track.canSeek) void source.seek(ratioAt(event) * track.duration)
  }
  const liked = $derived(track.like === 'like')
</script>

<!-- Partie lue : calque décalé à gauche dans un cadre décalé à droite (transform seulement). -->
{#snippet reveal(kind: string, ratio: number)}
  <span class="reveal" style:--p="{ratio * 100}%">
    <span class="layer {kind}"></span>
  </span>
{/snippet}

<div class="widget" class:paused={!track.playing}>
  <span class="wash" aria-hidden="true"></span>

  <header>
    <SoundcloudLogoIcon class="logo" size={24} weight="fill" aria-hidden="true" />
    <span class="label">SoundCloud</span>
    <button
      type="button"
      class="icon open"
      title="Ouvrir SoundCloud"
      aria-label="Ouvrir SoundCloud"
      onclick={() => source.open()}
    >
      <ArrowSquareOutIcon size={18} />
    </button>
  </header>

  <div class="now">
    <div class="art">
      {#if track.artwork}<img src={track.artwork} alt="" />{:else}<MusicNotesIcon
          size={24}
          aria-hidden="true"
        />{/if}
    </div>
    <div class="names">
      <span class="artist" title={track.artist}>{track.artist}</span>
      <span class="title" title={track.title}>{track.title}</span>
    </div>
  </div>

  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div
    class="wave"
    class:seekable={track.canSeek}
    data-no-drag
    onclick={seek}
    onmousemove={(event) => (hover = track.canSeek ? ratioAt(event) : null)}
    onmouseleave={() => (hover = null)}
  >
    <span class="shape" style:mask-image={mask}>
      <span class="layer base"></span>
      {#if hover !== null && hover > progress}{@render reveal('hover', hover)}{/if}
      {@render reveal('played', progress)}
      <span class="shine-box" style:--p="{progress * 100}%"><span class="shine"></span></span>
    </span>
    <span class="time now-time">{clock(track.time)}</span>
    <span class="time total">{clock(track.duration)}</span>
  </div>

  <div class="footer">
    <button
      type="button"
      class="play"
      aria-label={track.playing ? 'Pause' : 'Lecture'}
      onclick={() => source.control('toggle')}
    >
      {#if track.playing}<PauseIcon size={20} weight="fill" />{:else}<PlayIcon
          size={20}
          weight="fill"
        />{/if}
    </button>
    <button
      type="button"
      class="icon"
      aria-label="Titre précédent"
      onclick={() => source.control('previous')}
    >
      <SkipBackIcon size={20} weight="fill" />
    </button>
    <button
      type="button"
      class="icon"
      aria-label="Titre suivant"
      onclick={() => source.control('next')}
    >
      <SkipForwardIcon size={20} weight="fill" />
    </button>
    {#if track.like !== null}
      <button
        type="button"
        class="chip"
        class:on={liked}
        aria-pressed={liked}
        title="J'aime"
        onclick={() => source.control('like')}
      >
        <HeartIcon size={14} weight={liked ? 'fill' : 'bold'} aria-hidden="true" />
        {liked ? 'Aimé' : "J'aime"}
      </button>
    {/if}
  </div>
</div>

<style>
  .widget {
    position: relative;
    isolation: isolate;
    box-sizing: border-box;
    height: 100%;
    padding: 18px 20px 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    overflow: hidden;
  }

  .wash {
    position: absolute;
    inset: 0;
    z-index: -1;
    opacity: 0.8;
    background:
      radial-gradient(
        80% 70% at 100% 0%,
        color-mix(in srgb, var(--brand-soundcloud) 32%, transparent),
        transparent 65%
      ),
      radial-gradient(
        60% 60% at 0% 30%,
        color-mix(in srgb, var(--brand-soundcloud-blue) 32%, transparent),
        transparent 70%
      );
    pointer-events: none;
  }

  .paused * {
    animation-play-state: paused !important;
  }

  header {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 30px;
  }

  header :global(.logo) {
    color: var(--brand-soundcloud);
  }

  .label {
    font-size: var(--text-12);
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
    color: var(--text-faint);
  }

  .open {
    margin-left: auto;
  }

  .now {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .art {
    flex: none;
    width: 72px;
    height: 72px;
    display: grid;
    place-items: center;
    border-radius: var(--radius-input);
    overflow: hidden;
    background: var(--white-6);
    color: var(--text-faint);
    box-shadow:
      var(--shadow-art),
      inset 0 0 0 1px var(--white-8);
  }

  .art img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .names {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .artist,
  .title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .artist {
    font-size: var(--text-13);
    color: var(--text-muted);
  }

  .title {
    font-size: var(--text-16);
    font-weight: var(--weight-semibold);
    letter-spacing: var(--tracking-title);
  }

  /* Forme d'onde : prend la hauteur libre (96 px au plus). */
  .wave {
    position: relative;
    flex: 1;
    min-height: 56px;
    max-height: 96px;
  }

  .seekable {
    cursor: pointer;
  }

  .shape {
    position: absolute;
    inset: 0;
    overflow: hidden;
    mask-size: 100% 100%;
  }

  .layer {
    position: absolute;
    inset: 0;
  }

  .base {
    background: linear-gradient(var(--white-18) 0 69%, var(--white-8) 69% 100%);
  }

  .hover {
    background: linear-gradient(
      color-mix(in srgb, var(--brand-soundcloud-light) 55%, transparent) 0 69%,
      color-mix(in srgb, var(--brand-soundcloud-light) 22%, transparent) 69% 100%
    );
  }

  .played {
    background: linear-gradient(
      var(--brand-soundcloud-light) 0,
      var(--brand-soundcloud) 69%,
      color-mix(in srgb, var(--brand-soundcloud) 55%, transparent) 69%,
      color-mix(in srgb, var(--brand-soundcloud) 25%, transparent) 100%
    );
  }

  /* Cadre décalé de (p - 100 %), calque décalé d'autant dans l'autre sens : on voit 0 → p. */
  .reveal,
  .shine-box {
    position: absolute;
    inset: 0;
    overflow: hidden;
    transform: translateX(calc(var(--p) - 100%));
    transition: transform var(--dur-fill) linear;
  }

  .reveal .layer {
    transform: translateX(calc(100% - var(--p)));
    transition: transform var(--dur-fill) linear;
  }

  /* Reflet qui balaie la partie lue. */
  .shine {
    position: absolute;
    top: 0;
    bottom: 0;
    right: 0;
    width: 22%;
    background: linear-gradient(90deg, transparent, var(--white-18), transparent);
    animation: shine var(--dur-shine) ease-in-out infinite;
  }

  @keyframes shine {
    from {
      transform: translateX(-450%);
    }
    to {
      transform: translateX(120%);
    }
  }

  .time {
    position: absolute;
    top: 47%;
    padding: 1px 5px;
    border-radius: var(--radius-bar);
    background: var(--veil-deep);
    font-size: var(--text-11);
    font-variant-numeric: tabular-nums;
    pointer-events: none;
  }

  .now-time {
    left: 0;
    color: var(--brand-soundcloud-light);
  }

  .total {
    right: 0;
    color: var(--text-muted);
  }

  .footer {
    margin-top: auto;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  button {
    display: grid;
    place-items: center;
    padding: 0;
    border: 0;
    background: none;
    color: var(--text);
    font: inherit;
    cursor: pointer;
    transition: transform var(--dur-spring) var(--ease-spring);
  }

  button:active {
    transform: scale(0.9);
    transition-duration: var(--dur-press);
  }

  .icon {
    flex: none;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    color: var(--text-muted);
  }

  .icon:hover {
    color: var(--text);
    background: var(--white-8);
  }

  .play {
    flex: none;
    width: 46px;
    height: 46px;
    border-radius: 50%;
    background: linear-gradient(160deg, var(--brand-soundcloud-light), var(--brand-soundcloud));
    color: var(--ink);
    box-shadow:
      0 0 28px -6px var(--brand-soundcloud),
      inset 0 1px 0 var(--white-18);
  }

  .play:hover {
    transform: scale(1.06);
  }

  .chip {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 6px;
    height: var(--control-h-pill);
    padding: 0 12px;
    border-radius: var(--radius-pill);
    background: var(--white-6);
    border: 1px solid var(--line);
    color: var(--text-muted);
    font-size: var(--text-12);
  }

  .chip:hover {
    color: var(--text);
  }

  .chip.on {
    border-color: color-mix(in srgb, var(--brand-soundcloud) 45%, transparent);
    background: color-mix(in srgb, var(--brand-soundcloud) 16%, transparent);
    color: var(--brand-soundcloud-light);
  }

  button:focus-visible {
    outline: var(--focus-ring);
    outline-offset: var(--focus-offset);
  }
</style>
