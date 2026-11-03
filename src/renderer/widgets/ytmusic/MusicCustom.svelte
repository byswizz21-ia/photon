<script lang="ts">
  // YT Music, design « Adapté » : « Titre » (disque qui tourne, anneau rouge = progression) ou
  // « Clip » (pochette en grand qui zoome), au choix ; j'aime / je n'aime pas, playlist (ouvre YT
  // Music), volume, barre rouge, et les deux prochains titres de la file (clic = les jouer).
  // Case basse : pas de file.
  import MusicNotesIcon from 'phosphor-svelte/lib/MusicNotesIcon'
  import ArrowSquareOutIcon from 'phosphor-svelte/lib/ArrowSquareOutIcon'
  import PauseIcon from 'phosphor-svelte/lib/PauseIcon'
  import PlayIcon from 'phosphor-svelte/lib/PlayIcon'
  import PlaylistIcon from 'phosphor-svelte/lib/PlaylistIcon'
  import SkipBackIcon from 'phosphor-svelte/lib/SkipBackIcon'
  import SkipForwardIcon from 'phosphor-svelte/lib/SkipForwardIcon'
  import ThumbsDownIcon from 'phosphor-svelte/lib/ThumbsDownIcon'
  import ThumbsUpIcon from 'phosphor-svelte/lib/ThumbsUpIcon'
  import VideoCameraIcon from 'phosphor-svelte/lib/VideoCameraIcon'
  import YoutubeLogoIcon from 'phosphor-svelte/lib/YoutubeLogoIcon'
  import type { MusicTrack } from '../../../shared/api'
  import { clock, ratioAt, type MusicSource } from '../../lib/music/source.svelte'
  import Volume from '../../lib/music/Volume.svelte'

  let { source, track }: { source: MusicSource; track: MusicTrack } = $props()

  let mode = $state<'disc' | 'cover'>('disc') // Titre ou Clip

  $effect(() => {
    source.wantQueue = true
    return () => (source.wantQueue = false)
  })
  // Titres après celui en cours : autant que la place sous la barre en contient (50 px par
  // titre, libellé compris), deux tant qu'elle n'est pas mesurée.
  let queueHeight = $state(0)
  const count = $derived(queueHeight ? Math.max(1, Math.floor((queueHeight - 16) / 50)) : 2)
  const next = $derived.by(() => {
    const at = source.queue.findIndex((item) => item.current)
    return source.queue.slice(at + 1, at + 1 + count)
  })

  const progress = $derived(track.duration ? Math.min(1, track.time / track.duration) : 0)
  const seek = (event: MouseEvent): void => {
    if (track.canSeek) void source.seek(ratioAt(event) * track.duration)
  }
</script>

{#snippet art(size: number)}
  {#if track.artwork}<img src={track.artwork} alt="" />{:else}<MusicNotesIcon
      {size}
      aria-hidden="true"
    />{/if}
{/snippet}

<div
  class="widget"
  class:paused={!track.playing}
  style:--tint={source.tint || 'var(--brand-ytmusic)'}
>
  <span class="wash" aria-hidden="true"></span>

  <header>
    <YoutubeLogoIcon class="logo" size={24} weight="fill" aria-hidden="true" />
    <span class="label">YT Music</span>
    <fieldset class="seg" data-no-drag>
      <legend class="sr">Affichage</legend>
      <label>
        <input type="radio" bind:group={mode} value="disc" />
        <span>Titre</span>
      </label>
      <label>
        <input type="radio" bind:group={mode} value="cover" />
        <span>Clip</span>
      </label>
    </fieldset>
    <button
      type="button"
      class="icon"
      title="Ouvrir YT Music"
      aria-label="Ouvrir YT Music"
      onclick={() => source.open()}
    >
      <ArrowSquareOutIcon size={18} />
    </button>
  </header>

  <div class="now">
    <div class="media">
      <div class="disc-box" class:shown={mode === 'disc'} aria-hidden={mode !== 'disc'}>
        <span class="ring" style:--turn="{progress}turn"></span>
        <div class="disc">
          <span class="label-art">{@render art(18)}</span>
          <span class="hole"></span>
        </div>
        <span class="gloss"></span>
      </div>
      <div class="cover" class:shown={mode === 'cover'} aria-hidden={mode !== 'cover'}>
        <span class="zoom">{@render art(32)}</span>
        <span class="badge"><VideoCameraIcon size={12} weight="fill" aria-hidden="true" />Clip</span
        >
        <span class="mini"
          ><span class="mini-fill" style:transform="scaleX({progress})"></span></span
        >
      </div>
    </div>

    <div class="side">
      {#key track.title}
        <div class="names">
          <span class="title" title={track.title}>{track.title}</span>
          <span class="artist" title={track.artist}>{track.artist}</span>
        </div>
      {/key}
      <div class="rate">
        {#if track.like !== null}
          <button
            type="button"
            class="icon"
            class:on={track.like === 'like'}
            aria-label="J'aime"
            aria-pressed={track.like === 'like'}
            title="J'aime"
            onclick={() => source.control('like')}
          >
            <ThumbsUpIcon size={18} weight={track.like === 'like' ? 'fill' : 'duotone'} />
          </button>
          <button
            type="button"
            class="icon"
            class:on={track.like === 'dislike'}
            aria-label="Je n'aime pas"
            aria-pressed={track.like === 'dislike'}
            title="Je n'aime pas"
            onclick={() => source.control('dislike')}
          >
            <ThumbsDownIcon size={18} weight={track.like === 'dislike' ? 'fill' : 'duotone'} />
          </button>
        {/if}
        <button
          type="button"
          class="icon"
          aria-label="Enregistrer dans une playlist (ouvre YT Music)"
          title="Enregistrer dans une playlist (ouvre YT Music)"
          onclick={() => source.open()}
        >
          <PlaylistIcon size={18} weight="duotone" />
        </button>
      </div>
      <div class="controls">
        <button
          type="button"
          class="icon"
          aria-label="Morceau précédent"
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
          {#if track.playing}<PauseIcon size={20} weight="fill" />{:else}<PlayIcon
              size={20}
              weight="fill"
            />{/if}
        </button>
        <button
          type="button"
          class="icon"
          aria-label="Morceau suivant"
          onclick={() => source.control('next')}
        >
          <SkipForwardIcon size={20} weight="fill" />
        </button>
        {#if track.volume >= 0}
          <Volume {source} volume={track.volume} />
        {/if}
      </div>
    </div>
  </div>

  <div class="progress">
    <span>{clock(track.time)}</span>
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div class="bar" class:seekable={track.canSeek} onclick={seek} data-no-drag>
      <span class="track"><span class="fill" style:transform="scaleX({progress})"></span></span>
      <span class="thumb-rail" style:transform="translateX({progress * 100}%)"
        ><span class="thumb"></span></span
      >
    </div>
    <span>{clock(track.duration)}</span>
  </div>

  {#if next.length}
    <div class="queue" bind:clientHeight={queueHeight}>
      <span class="label">À suivre</span>
      {#each next as item (item.id)}
        <button
          type="button"
          class="item"
          title="Lire maintenant"
          onclick={() => source.play(item.id)}
        >
          <span class="thumb-art">
            {#if item.artwork}<img src={item.artwork} alt="" />{:else}<MusicNotesIcon
                size={14}
                aria-hidden="true"
              />{/if}
          </span>
          <span class="item-names">
            <span class="item-title">{item.title}</span>
            <span class="item-artist">{item.artist}</span>
          </span>
          <span class="item-time">{item.duration}</span>
        </button>
      {/each}
    </div>
  {/if}
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
    --media: clamp(140px, min(30cqw, 100cqh - 400px), 220px);
  }

  .wash {
    position: absolute;
    inset: 0;
    z-index: -1;
    opacity: 0.8;
    background:
      radial-gradient(
        60% 60% at 16% 32%,
        color-mix(in srgb, var(--brand-ytmusic) 34%, transparent),
        transparent 70%
      ),
      radial-gradient(
        60% 50% at 100% 100%,
        color-mix(in srgb, var(--brand-ytmusic) 12%, transparent),
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
    color: var(--brand-ytmusic);
  }

  .label {
    font-size: var(--text-12);
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
    color: var(--text-faint);
  }

  /* Titre / Clip : deux pastilles. */
  .seg {
    margin: 0 0 0 auto;
    padding: 2px;
    display: flex;
    gap: 2px;
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
    margin: 0;
    opacity: 0;
    cursor: pointer;
  }

  .seg span {
    padding: 2px 10px;
    border-radius: var(--radius-pill);
    font-size: var(--text-12);
    color: var(--text-muted);
  }

  .seg input:checked + span {
    background: color-mix(in srgb, var(--brand-ytmusic) 22%, transparent);
    color: var(--brand-ytmusic);
  }

  .seg input:focus-visible + span {
    outline: var(--focus-ring);
  }

  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }

  .now {
    display: flex;
    gap: 18px;
  }

  .media {
    position: relative;
    flex: none;
    width: var(--media);
    height: var(--media);
  }

  .disc-box,
  .cover {
    position: absolute;
    inset: 0;
    opacity: 0;
    transition:
      opacity var(--dur-fade) var(--ease-out),
      transform var(--dur-spring-card) var(--ease-spring);
  }

  .disc-box {
    transform: scale(0.84) rotate(-12deg);
  }

  .cover {
    transform: scale(1.08);
  }

  .disc-box.shown,
  .cover.shown {
    opacity: 1;
    transform: none;
  }

  /* Anneau de progression autour du disque. */
  .ring {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: conic-gradient(var(--brand-ytmusic) var(--turn), var(--white-8) 0);
    mask-image: radial-gradient(circle, transparent calc(50% - 4px), #000 calc(50% - 3px));
    filter: drop-shadow(0 0 6px var(--brand-ytmusic));
  }

  .disc {
    position: absolute;
    inset: 9px;
    border-radius: 50%;
    overflow: hidden;
    background:
      repeating-radial-gradient(circle, transparent 0 1.5px, var(--veil-art) 1.5px 2.5px),
      color-mix(in srgb, var(--tint) 60%, var(--ink));
    box-shadow:
      var(--shadow-art),
      inset 0 0 0 1px var(--white-8);
    animation: spin var(--dur-disc) linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .label-art {
    position: absolute;
    inset: 33%;
    display: grid;
    place-items: center;
    border-radius: 50%;
    overflow: hidden;
    background: var(--white-8);
    color: var(--text-faint);
    box-shadow: 0 0 0 2px var(--veil-art);
  }

  .label-art img,
  .zoom img,
  .thumb-art img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .hole {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 8px;
    height: 8px;
    margin: -4px 0 0 -4px;
    border-radius: 50%;
    background: var(--ink);
  }

  .gloss {
    position: absolute;
    inset: 9px;
    border-radius: 50%;
    pointer-events: none;
    background: conic-gradient(
      from 30deg,
      transparent 0deg,
      var(--white-12) 40deg,
      transparent 90deg 180deg,
      var(--white-9) 220deg,
      transparent 270deg
    );
  }

  /* Pochette en grand, zoom lent pendant la lecture. */
  .cover {
    border-radius: var(--radius-tile);
    overflow: hidden;
    background: var(--ink);
    box-shadow:
      var(--shadow-art),
      inset 0 0 0 1px var(--white-8);
  }

  .zoom {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    color: var(--text-faint);
    animation: kenburns var(--dur-disc) ease-in-out infinite alternate;
  }

  @keyframes kenburns {
    from {
      transform: scale(1.1);
    }
    to {
      transform: scale(1.35) translate(-7%, 5%);
    }
  }

  .badge {
    position: absolute;
    left: 8px;
    top: 8px;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: var(--radius-pill);
    background: var(--veil-art);
    font-size: var(--text-11);
    color: var(--white);
  }

  .mini {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 3px;
    background: var(--white-15);
  }

  .mini-fill {
    position: absolute;
    inset: 0;
    background: var(--brand-ytmusic);
    transform-origin: left;
    transition: transform var(--dur-fill) linear;
  }

  .side {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .names {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding-top: 4px;
    animation: swap var(--dur-swap) var(--ease-out);
  }

  @keyframes swap {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
  }

  .title,
  .artist {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .title {
    font-size: var(--text-18);
    font-weight: var(--weight-semibold);
    letter-spacing: var(--tracking-title);
  }

  .artist {
    font-size: var(--text-13);
    color: var(--text-muted);
  }

  .rate {
    display: flex;
    gap: 2px;
    margin: 10px 0 0 -6px;
  }

  .controls {
    margin-top: auto;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .controls > :global(.volume) {
    margin-left: auto;
  }

  /* Case étroite : bouton du son sans curseur. */
  @container (max-width: 439px) {
    .controls :global(input) {
      display: none;
    }
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

  .icon.on {
    color: var(--text);
    background: var(--white-8);
  }

  .play {
    flex: none;
    width: 46px;
    height: 46px;
    border-radius: 50%;
    background: var(--text);
    color: var(--bg);
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
    position: relative;
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
    height: 3px;
    background: var(--white-18);
  }

  .fill {
    position: absolute;
    inset: 0;
    background: var(--brand-ytmusic);
    transform-origin: left;
    transition: transform var(--dur-fill) linear;
  }

  .thumb-rail {
    position: absolute;
    inset: 0;
    pointer-events: none;
    transition: transform var(--dur-fill) linear;
  }

  .thumb {
    position: absolute;
    left: -6px;
    top: 1px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--brand-ytmusic);
    box-shadow: 0 0 10px var(--brand-ytmusic);
  }

  .queue {
    flex: 1 1 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-height: 0;
    overflow: hidden;
  }

  .item {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    gap: 10px;
    margin: 0 -8px;
    padding: 5px 8px;
    border-radius: var(--radius-row);
    text-align: left;
  }

  .item:hover {
    background: var(--surface-hover);
  }

  .thumb-art {
    flex: none;
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    border-radius: var(--radius-pre);
    overflow: hidden;
    background: var(--white-6);
    color: var(--text-faint);
    box-shadow: inset 0 0 0 1px var(--white-8);
  }

  .item-names {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .item-title,
  .item-artist {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .item-title {
    font-size: var(--text-13);
    font-weight: var(--weight-medium);
  }

  .item-artist,
  .item-time {
    font-size: var(--text-12);
    color: var(--text-faint);
  }

  .item-time {
    font-variant-numeric: tabular-nums;
  }

  button:focus-visible {
    outline: var(--focus-ring);
    outline-offset: var(--focus-offset);
  }

  /* Case basse : pas de file, disque plus petit. */
  @container (max-height: 369px) {
    .queue {
      display: none;
    }
  }

  @container (max-height: 420px) {
    .widget {
      --media: 120px;
    }
  }

  /* Carte de 3 cases de large : disque, titre et notes côte à côte, commandes en dessous. */
  @container (max-width: 320px) {
    .widget {
      --media: 96px;
    }

    header .label {
      display: none;
    }

    .now {
      display: grid;
      grid-template-columns: var(--media) minmax(0, 1fr);
      grid-template-areas: 'media names' 'media rate' 'controls controls';
      gap: 6px 14px;
    }

    .media {
      grid-area: media;
    }

    .side {
      display: contents;
    }

    .names {
      grid-area: names;
      align-self: end;
    }

    .rate {
      grid-area: rate;
    }

    .controls {
      grid-area: controls;
      justify-content: center;
      margin-top: 8px;
    }
  }
</style>
