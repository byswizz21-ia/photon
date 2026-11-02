<script lang="ts">
  // Deezer, design « Adapté » : grand disque façon Flow (taches de couleur qui tournent, ondes et
  // battement pendant la lecture, pochette au centre ; clic = lecture/pause), titre, coup de cœur,
  // barre violette, volume en haut. Les humeurs du Flow ne sont pas pilotables depuis Photon : pas de pastilles.
  import ArrowSquareOutIcon from 'phosphor-svelte/lib/ArrowSquareOutIcon'
  import HeartIcon from 'phosphor-svelte/lib/HeartIcon'
  import MusicNotesIcon from 'phosphor-svelte/lib/MusicNotesIcon'
  import PauseIcon from 'phosphor-svelte/lib/PauseIcon'
  import PlayIcon from 'phosphor-svelte/lib/PlayIcon'
  import SkipBackIcon from 'phosphor-svelte/lib/SkipBackIcon'
  import SkipForwardIcon from 'phosphor-svelte/lib/SkipForwardIcon'
  import WaveformIcon from 'phosphor-svelte/lib/WaveformIcon'
  import type { MusicTrack } from '../../../shared/api'
  import { clock, ratioAt, type MusicSource } from '../../lib/music/source.svelte'
  import Volume from '../../lib/music/Volume.svelte'

  let { source, track }: { source: MusicSource; track: MusicTrack } = $props()

  const progress = $derived(track.duration ? Math.min(1, track.time / track.duration) : 0)
  const seek = (event: MouseEvent): void => {
    if (track.canSeek) void source.seek(ratioAt(event) * track.duration)
  }
  const liked = $derived(track.like === 'like')
</script>

<div
  class="widget"
  class:paused={!track.playing}
  style:--tint={source.tint || 'var(--brand-deezer)'}
>
  <span class="wash" aria-hidden="true"></span>

  <header>
    <WaveformIcon class="logo" size={22} weight="fill" aria-hidden="true" />
    <span class="label">Deezer</span>
    {#if track.volume >= 0}
      <Volume {source} volume={track.volume} width={84} tint="var(--brand-deezer-light)" />
    {/if}
    <button
      type="button"
      class="icon open"
      title="Ouvrir Deezer"
      aria-label="Ouvrir Deezer"
      onclick={() => source.open()}
    >
      <ArrowSquareOutIcon size={18} />
    </button>
  </header>

  <div class="now">
    <div class="orb-box">
      <span class="ripple" aria-hidden="true"></span>
      <span class="ripple late" aria-hidden="true"></span>
      <button
        type="button"
        class="orb"
        aria-label={track.playing ? 'Pause' : 'Lecture'}
        onclick={() => source.control('toggle')}
      >
        <span class="blob a" aria-hidden="true"></span>
        <span class="blob b" aria-hidden="true"></span>
        <span class="blob c" aria-hidden="true"></span>
        <span class="shine" aria-hidden="true"></span>
        <span class="cover">
          {#if track.artwork}<img src={track.artwork} alt="" />{:else}<MusicNotesIcon
              size={28}
              aria-hidden="true"
            />{/if}
        </span>
      </button>
    </div>

    <div class="side">
      <div class="names">
        <span class="kicker">{track.playing ? 'En écoute' : 'En pause'}</span>
        {#key track.title}
          <span class="title" title={track.title}>{track.title}</span>
        {/key}
        <span class="artist" title={track.artist}>{track.artist}</span>
      </div>
      <div class="controls">
        {#if track.like !== null}
          <button
            type="button"
            class="icon"
            class:on={liked}
            aria-label="Coup de cœur"
            aria-pressed={liked}
            title="Coup de cœur"
            onclick={() => source.control('like')}
          >
            <HeartIcon size={20} weight={liked ? 'fill' : 'duotone'} />
          </button>
        {/if}
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
          class="play"
          aria-label={track.playing ? 'Pause' : 'Lecture'}
          onclick={() => source.control('toggle')}
        >
          {#if track.playing}<PauseIcon size={22} weight="fill" />{:else}<PlayIcon
              size={22}
              weight="fill"
            />{/if}
        </button>
        <button
          type="button"
          class="icon"
          aria-label="Titre suivant"
          onclick={() => source.control('next')}
        >
          <SkipForwardIcon size={20} weight="fill" />
        </button>
      </div>
    </div>
  </div>

  <div class="progress">
    <span>{clock(track.time)}</span>
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div class="bar" class:seekable={track.canSeek} onclick={seek} data-no-drag>
      <span class="track"><span class="fill" style:transform="scaleX({progress})"></span></span>
    </div>
    <span>{clock(track.duration)}</span>
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
    --orb: min(196px, 42cqw, calc(100cqh - 150px));
  }

  .wash {
    position: absolute;
    inset: 0;
    z-index: -1;
    opacity: 0.8;
    background:
      radial-gradient(
        70% 80% at 22% 55%,
        color-mix(in srgb, var(--brand-deezer) 50%, transparent),
        transparent 70%
      ),
      radial-gradient(
        60% 60% at 100% 0%,
        color-mix(in srgb, var(--brand-deezer-pink) 20%, transparent),
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
    color: var(--brand-deezer-light);
  }

  /* Volume et « ouvrir » poussés à droite. */
  .label {
    margin-right: auto;
    font-size: var(--text-12);
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
    color: var(--text-faint);
  }

  .now {
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: center;
    gap: 20px;
  }

  /* Disque Flow : ondes qui s'élargissent, battement, taches floues qui dérivent, reflet tournant. */
  .orb-box {
    position: relative;
    flex: none;
    width: var(--orb);
    height: var(--orb);
  }

  .ripple {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 1.5px solid color-mix(in srgb, var(--brand-deezer-light) 55%, transparent);
    opacity: 0;
    animation: ripple var(--dur-ripple) var(--ease-out) infinite;
  }

  .ripple.late {
    animation-delay: calc(var(--dur-ripple) / -2);
  }

  @keyframes ripple {
    from {
      transform: scale(1);
      opacity: 0.75;
    }
    to {
      transform: scale(1.3);
      opacity: 0;
    }
  }

  .orb {
    position: absolute;
    inset: 0;
    padding: 0;
    border: 0;
    border-radius: 50%;
    overflow: hidden;
    cursor: pointer;
    background: var(--surface-icon-tile);
    box-shadow:
      0 0 70px -14px var(--brand-deezer),
      inset 0 1px 0 var(--white-18);
    animation: beat var(--dur-beat) var(--ease-out) infinite;
  }

  @keyframes beat {
    14% {
      transform: scale(1.04);
    }
  }

  .blob {
    position: absolute;
    border-radius: 50%;
    filter: blur(18px);
    animation: orbit-a var(--dur-orbit) ease-in-out infinite alternate;
  }

  .blob.a {
    left: -15%;
    top: -10%;
    width: 85%;
    height: 85%;
    background: var(--brand-deezer);
  }

  .blob.b {
    right: -20%;
    bottom: -15%;
    width: 90%;
    height: 90%;
    background: var(--tint);
    animation-name: orbit-b;
    animation-duration: calc(var(--dur-orbit) * 1.2);
  }

  .blob.c {
    left: 22%;
    top: 34%;
    width: 58%;
    height: 58%;
    background: var(--brand-deezer-pink);
    opacity: 0.9;
    animation-name: orbit-c;
    animation-duration: calc(var(--dur-orbit) * 0.75);
  }

  @keyframes orbit-a {
    50% {
      transform: translate(28%, 14%) scale(1.15);
    }
    to {
      transform: translate(8%, 38%) scale(0.9);
    }
  }

  @keyframes orbit-b {
    from {
      transform: scale(1.1);
    }
    50% {
      transform: translate(-24%, -12%) scale(0.9);
    }
    to {
      transform: translate(-32%, 18%) scale(1.2);
    }
  }

  @keyframes orbit-c {
    to {
      transform: translate(22%, -30%) scale(1.35);
    }
  }

  .shine {
    position: absolute;
    inset: -20%;
    background: conic-gradient(from 0deg, transparent, var(--white-18), transparent 35%);
    mix-blend-mode: overlay;
    animation: spin calc(var(--dur-orbit) * 1.25) linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Pochette ronde au centre du disque. */
  .cover {
    position: absolute;
    inset: 27%;
    display: grid;
    place-items: center;
    border-radius: 50%;
    overflow: hidden;
    background: var(--veil-art);
    color: var(--white);
    box-shadow:
      0 8px 24px -8px var(--veil-art),
      0 0 0 2px var(--white-15);
  }

  .cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .side {
    flex: 1;
    min-width: 0;
    align-self: stretch;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 14px;
  }

  .names {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .kicker {
    font-size: var(--text-12);
    font-weight: var(--weight-medium);
    color: var(--brand-deezer-light);
  }

  .title {
    font-size: var(--text-18);
    font-weight: var(--weight-semibold);
    letter-spacing: var(--tracking-title);
    line-height: 1.25;
    text-wrap: balance;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    animation: swap var(--dur-swap) var(--ease-out);
  }

  @keyframes swap {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
  }

  .artist {
    font-size: var(--text-14);
    color: var(--text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .controls {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-left: -6px;
  }

  button:where(:not(.orb)) {
    display: grid;
    place-items: center;
    padding: 0;
    border: 0;
    background: none;
    color: var(--text);
    cursor: pointer;
    transition: transform var(--dur-spring) var(--ease-spring);
  }

  button:where(:not(.orb)):active {
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

  .icon.on {
    color: var(--brand-deezer-light);
  }

  .play {
    flex: none;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: var(--brand-deezer);
    color: var(--white);
    box-shadow:
      0 0 28px -6px var(--brand-deezer),
      inset 0 1px 0 var(--white-18);
  }

  .play:hover {
    transform: scale(1.06);
  }

  .progress {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: var(--text-11);
    color: var(--text-faint);
    font-variant-numeric: tabular-nums;
  }

  .progress > span {
    min-width: 28px;
  }

  .progress > span:last-child {
    text-align: right;
  }

  .bar {
    flex: 1;
    height: 14px;
    display: flex;
    align-items: center;
  }

  .seekable {
    cursor: pointer;
  }

  .track {
    position: relative;
    width: 100%;
    height: 4px;
    border-radius: 2px;
    background: var(--white-15);
  }

  .fill {
    position: absolute;
    inset: 0;
    border-radius: 2px;
    background: linear-gradient(90deg, var(--brand-deezer-deep), var(--brand-deezer-light));
    box-shadow: 0 0 10px color-mix(in srgb, var(--brand-deezer) 90%, transparent);
    transform-origin: left;
    transition: transform var(--dur-fill) linear;
  }

  button:focus-visible {
    outline: var(--focus-ring);
    outline-offset: var(--focus-offset);
  }
</style>
