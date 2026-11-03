<script lang="ts">
  // Spotify, design « Adapté » : pochette, paroles synchronisées (LRCLIB, ligne en cours au centre),
  // barre verte lumineuse, aléatoire et répéter marqués d'un point, volume. Pas de « J'aime » : l'app
  // Spotify de Windows ne le publie pas. Paroles cachées si introuvables ou case trop basse.
  import ArrowSquareOutIcon from 'phosphor-svelte/lib/ArrowSquareOutIcon'
  import MusicNotesIcon from 'phosphor-svelte/lib/MusicNotesIcon'
  import PauseIcon from 'phosphor-svelte/lib/PauseIcon'
  import PlayIcon from 'phosphor-svelte/lib/PlayIcon'
  import RepeatIcon from 'phosphor-svelte/lib/RepeatIcon'
  import RepeatOnceIcon from 'phosphor-svelte/lib/RepeatOnceIcon'
  import ShuffleIcon from 'phosphor-svelte/lib/ShuffleIcon'
  import SkipBackIcon from 'phosphor-svelte/lib/SkipBackIcon'
  import SkipForwardIcon from 'phosphor-svelte/lib/SkipForwardIcon'
  import SpotifyLogoIcon from 'phosphor-svelte/lib/SpotifyLogoIcon'
  import type { LyricLine, MusicTrack } from '../../../shared/api'
  import { clock, ratioAt, type MusicSource } from '../../lib/music/source.svelte'
  import Volume from '../../lib/music/Volume.svelte'

  let { source, track }: { source: MusicSource; track: MusicTrack } = $props()

  const LINE_H = 30 // px, hauteur d'une ligne de paroles

  // Paroles du morceau en cours ; une demande par morceau, la réponse d'un ancien est ignorée.
  let lyrics = $state.raw<LyricLine[] | null>(null)
  const key = $derived(`${track.artist}\n${track.title}\n${Math.round(track.duration)}`)
  $effect(() => {
    const [artist = '', title = '', duration = '0'] = key.split('\n')
    let alive = true
    lyrics = null
    void window.photon
      .musicLyrics(title, artist, Number(duration))
      .then((lines) => alive && (lyrics = lines))
    return () => {
      alive = false
    }
  })
  const line = $derived(lyrics ? lyrics.findLastIndex((l) => l.time <= track.time) : -1)
  // Hauteur des paroles : 3 lignes au moins, plus si la carte est haute ; ligne en cours au milieu.
  let lyricsHeight = $state(3 * LINE_H)
  const middle = $derived(Math.floor(lyricsHeight / LINE_H / 2))

  const progress = $derived(track.duration ? Math.min(1, track.time / track.duration) : 0)
  const seek = (event: MouseEvent): void => {
    if (track.canSeek) void source.seek(ratioAt(event) * track.duration)
  }
</script>

<div class="widget" class:paused={!track.playing} style:--tint={source.tint || 'transparent'}>
  <span class="wash" aria-hidden="true"></span>
  <span class="halo" aria-hidden="true"></span>

  <header>
    <SpotifyLogoIcon class="logo" size={22} weight="fill" aria-hidden="true" />
    <span class="label">Spotify</span>
    <span class="device" title="Lecture sur ce PC">
      <span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
      Ce PC
    </span>
    <button
      type="button"
      class="icon"
      title="Ouvrir Spotify"
      aria-label="Ouvrir Spotify"
      onclick={() => source.open()}
    >
      <ArrowSquareOutIcon size={18} />
    </button>
  </header>

  <div class="now">
    <div class="art">
      {#if track.artwork}<img src={track.artwork} alt="" />{:else}<MusicNotesIcon
          size={32}
          aria-hidden="true"
        />{/if}
    </div>
    <div class="names">
      <span class="title" title={track.title}>{track.title}</span>
      <span class="artist" title={track.artist}>{track.artist}</span>
    </div>
  </div>

  {#if lyrics}
    <div class="lyrics" aria-label="Paroles" bind:clientHeight={lyricsHeight}>
      <div class="lines" style:transform="translateY({(middle - Math.max(line, 0)) * LINE_H}px)">
        {#each lyrics as l, i (i)}
          <p class:past={i < line} class:current={i === line}>{l.text}</p>
        {/each}
      </div>
    </div>
  {/if}

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

  <div class="controls">
    <span></span>
    <div class="buttons">
      {#if track.shuffle !== null}
        <button
          type="button"
          class="icon"
          class:on={track.shuffle}
          aria-label="Lecture aléatoire"
          aria-pressed={track.shuffle}
          title="Lecture aléatoire"
          onclick={() => source.control('shuffle')}
        >
          <ShuffleIcon size={18} weight="bold" />
        </button>
      {/if}
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
        {#if track.playing}<PauseIcon size={22} weight="fill" />{:else}<PlayIcon
            size={22}
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
      {#if track.repeat !== null}
        <button
          type="button"
          class="icon"
          class:on={track.repeat !== 'none'}
          aria-label={track.repeat === 'one'
            ? 'Répéter : ce morceau'
            : track.repeat === 'all'
              ? 'Répéter : toute la file'
              : 'Répéter : désactivé'}
          title="Répéter"
          onclick={() => source.control('repeat')}
        >
          {#if track.repeat === 'one'}<RepeatOnceIcon size={18} weight="bold" />{:else}<RepeatIcon
              size={18}
              weight="bold"
            />{/if}
        </button>
      {/if}
    </div>
    {#if track.volume >= 0}
      <Volume {source} volume={track.volume} width={62} tint="var(--brand-spotify)" />
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

  /* Fond : teinte de la pochette en haut à gauche, vert Spotify en bas, halo qui dérive. */
  .wash {
    position: absolute;
    inset: 0;
    z-index: -1;
    opacity: 0.8;
    background:
      radial-gradient(
        70% 70% at 10% 25%,
        color-mix(in srgb, var(--tint) 55%, transparent),
        transparent 70%
      ),
      radial-gradient(
        70% 60% at 50% 120%,
        color-mix(in srgb, var(--brand-spotify) 30%, transparent),
        transparent 70%
      );
    pointer-events: none;
  }

  .halo {
    position: absolute;
    left: -80px;
    top: -60px;
    z-index: -1;
    width: 280px;
    height: 280px;
    border-radius: 50%;
    background: radial-gradient(
      circle,
      color-mix(in srgb, var(--tint) 40%, transparent),
      transparent 68%
    );
    pointer-events: none;
    animation: drift var(--dur-drift) ease-in-out infinite alternate;
  }

  @keyframes drift {
    to {
      transform: translate(70px, 40px) scale(1.2);
    }
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
    color: var(--brand-spotify);
  }

  .label {
    font-size: var(--text-12);
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
    color: var(--text-faint);
  }

  .device {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 7px;
    height: 26px;
    box-sizing: border-box;
    padding: 0 10px 0 9px;
    border-radius: var(--radius-pill);
    border: 1px solid color-mix(in srgb, var(--brand-spotify) 35%, transparent);
    background: color-mix(in srgb, var(--brand-spotify) 12%, transparent);
    color: var(--brand-spotify);
    font-size: var(--text-12);
    font-weight: var(--weight-medium);
  }

  /* Égaliseur : quatre barres qui montent et descendent pendant la lecture. */
  .eq {
    display: flex;
    align-items: flex-end;
    gap: 2px;
    height: 11px;
  }

  .eq i {
    width: 2px;
    height: 100%;
    border-radius: 1px;
    background: currentColor;
    transform-origin: bottom;
    animation: eq var(--dur-eq) ease-in-out infinite alternate;
  }

  .eq i:nth-child(2) {
    animation-duration: calc(var(--dur-eq) * 0.73);
    animation-delay: -0.3s;
  }

  .eq i:nth-child(3) {
    animation-duration: calc(var(--dur-eq) * 1.26);
    animation-delay: -0.5s;
  }

  .eq i:nth-child(4) {
    animation-duration: calc(var(--dur-eq) * 0.9);
    animation-delay: -0.15s;
  }

  @keyframes eq {
    from {
      transform: scaleY(0.25);
    }
  }

  .now {
    display: flex;
    align-items: center;
    gap: 16px;
    min-height: 0;
  }

  /* 116 px à la taille prévue, plus grande avec la carte. */
  .art {
    flex: none;
    width: clamp(96px, min(26cqw, 100cqh - 300px), 200px);
    height: auto;
    aspect-ratio: 1;
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
    gap: 4px;
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
    font-size: var(--text-14);
    color: var(--text-muted);
  }

  /* Paroles : trois lignes visibles, la ligne en cours au milieu, fondu en haut et en bas. */
  .lyrics {
    flex: 1 1 90px;
    min-height: 90px;
    max-height: 270px;
    overflow: hidden;
    mask-image: linear-gradient(transparent, #000 24%, #000 68%, transparent);
  }

  .lines {
    transition: transform var(--dur-lyrics) var(--ease-spring);
  }

  .lines p {
    margin: 0;
    height: 30px;
    line-height: 30px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--text-16);
    font-weight: var(--weight-semibold);
    letter-spacing: var(--tracking-title);
    color: var(--white);
    opacity: 0.36;
    transition: opacity var(--dur-fill) var(--ease-out);
  }

  .lines p.past {
    opacity: 0.18;
  }

  .lines p.current {
    opacity: 1;
    text-shadow: 0 0 18px var(--white-18);
  }

  .progress {
    margin-top: auto;
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
    height: 4px;
    border-radius: 2px;
    background: var(--white-15);
  }

  .fill {
    position: absolute;
    inset: 0;
    border-radius: 2px;
    background: var(--brand-spotify);
    box-shadow: 0 0 10px color-mix(in srgb, var(--brand-spotify) 80%, transparent);
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
    background: var(--white);
    box-shadow:
      0 0 0 3px color-mix(in srgb, var(--brand-spotify) 35%, transparent),
      var(--shadow-thumb);
    opacity: 0;
    transition: opacity var(--dur-fast) var(--ease-out);
  }

  .bar.seekable:hover .thumb {
    opacity: 1;
  }

  /* Commandes au centre, volume à droite. */
  .controls {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    align-items: center;
  }

  .buttons {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .controls > :global(.volume) {
    justify-self: end;
  }

  button {
    display: grid;
    place-items: center;
    padding: 0;
    border: 0;
    background: none;
    color: var(--text);
    cursor: pointer;
    transition: transform var(--dur-spring) var(--ease-spring);
  }

  button:active {
    transform: scale(0.9);
    transition-duration: var(--dur-press);
  }

  .icon {
    position: relative;
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

  /* Aléatoire, répéter actifs : vert et un point lumineux dessous. */
  .icon.on {
    color: var(--brand-spotify);
  }

  .icon.on::after {
    content: '';
    position: absolute;
    bottom: -4px;
    left: 50%;
    width: 4px;
    height: 4px;
    margin-left: -2px;
    border-radius: 50%;
    background: var(--brand-spotify);
    box-shadow: 0 0 6px var(--brand-spotify);
  }

  .play {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: var(--brand-spotify);
    color: var(--ink);
    box-shadow:
      0 0 28px -6px color-mix(in srgb, var(--brand-spotify) 85%, transparent),
      inset 0 1px 0 var(--white-18);
  }

  .play:hover {
    transform: scale(1.06);
  }

  .play:active {
    transform: scale(0.9);
  }

  button:focus-visible {
    outline: var(--focus-ring);
    outline-offset: var(--focus-offset);
  }

  /* Case basse : plus de paroles. */
  /* Case étroite : bouton du son sans curseur. */
  @container (max-width: 459px) {
    .controls :global(input) {
      display: none;
    }
  }

  @container (max-height: 369px) {
    .lyrics {
      display: none;
    }
  }

  /* Carte de 3 cases de large : commandes réparties sur toute la largeur, volume compris. */
  @container (max-width: 320px) {
    .controls {
      display: flex;
      justify-content: space-between;
    }

    .controls > span:first-child {
      display: none;
    }

    .buttons {
      gap: 2px;
    }
  }
</style>
