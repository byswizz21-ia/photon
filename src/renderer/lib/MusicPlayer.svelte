<script lang="ts" module>
  // Réglages communs aux widgets de musique : notification, accent pris sur la pochette, design.
  export type MusicSettings = { notify: boolean; accent: boolean; design: string }
  export const MUSIC_DEFAULTS: MusicSettings = { notify: false, accent: false, design: 'sober' }
</script>

<script lang="ts">
  // Design « Sobre », le même pour YT Music, Deezer, SoundCloud et Spotify (lib/music/) :
  // petite case : pochette + lecture ; moyenne : titre, like, progression, volume ; grande : aussi
  // « je n'aime pas », aléatoire, répéter et, pour YT Music, la file « À suivre » (clic = jouer ce
  // morceau). Ce qu'un service n'offre pas (état null) n'a pas de bouton. La couleur de la
  // pochette teinte le fond du widget.
  import ArrowSquareOutIcon from 'phosphor-svelte/lib/ArrowSquareOutIcon'
  import MusicNotesIcon from 'phosphor-svelte/lib/MusicNotesIcon'
  import PauseIcon from 'phosphor-svelte/lib/PauseIcon'
  import PlayIcon from 'phosphor-svelte/lib/PlayIcon'
  import RepeatIcon from 'phosphor-svelte/lib/RepeatIcon'
  import RepeatOnceIcon from 'phosphor-svelte/lib/RepeatOnceIcon'
  import ShuffleIcon from 'phosphor-svelte/lib/ShuffleIcon'
  import SkipBackIcon from 'phosphor-svelte/lib/SkipBackIcon'
  import SkipForwardIcon from 'phosphor-svelte/lib/SkipForwardIcon'
  import ThumbsDownIcon from 'phosphor-svelte/lib/ThumbsDownIcon'
  import ThumbsUpIcon from 'phosphor-svelte/lib/ThumbsUpIcon'
  import { MUSIC_SERVICES, type MusicTrack } from '../../shared/api'
  import { clock, type MusicSource } from './music/source.svelte'
  import Volume from './music/Volume.svelte'

  let { source, track }: { source: MusicSource; track: MusicTrack } = $props()

  const service = $derived(source.service)
  const name = $derived(MUSIC_SERVICES[service])
  const control = (command: Parameters<MusicSource['control']>[0]): Promise<void> =>
    source.control(command)

  // Curseur tenu par la souris : on n'écrase pas sa position avec la lecture suivante.
  let dragTime = $state<number | null>(null)

  let width = $state(0)
  let height = $state(0)
  const large = $derived(height >= 300 && width >= 380)
  $effect(() => {
    source.wantQueue = large
  })
  const queue = $derived(large ? source.queue : [])
</script>

<div
  class="widget"
  class:large
  data-no-press
  style:--tint={source.tint || 'transparent'}
  bind:clientWidth={width}
  bind:clientHeight={height}
>
  <span class="glow" aria-hidden="true"></span>
  <div class="main">
    <div class="art">
      {#if track.artwork}
        <img src={track.artwork} alt="" />
      {:else}
        <MusicNotesIcon size={28} aria-hidden="true" />
      {/if}
      <!-- Petite case : seul contrôle, posé sur la pochette. -->
      <button
        type="button"
        class="play overlay"
        aria-label={track.playing ? 'Pause' : 'Lecture'}
        onclick={() => control('toggle')}
      >
        {#if track.playing}<PauseIcon size={22} weight="fill" />{:else}<PlayIcon
            size={22}
            weight="fill"
          />{/if}
      </button>
    </div>
    <div class="details">
      <div class="head">
        <div class="names">
          <p class="title" title={track.title}>{track.title}</p>
          <p class="artist" title={track.artist}>{track.artist}</p>
        </div>
        {#if track.like !== null}
          <!-- « Je n'aime pas » : YT Music seulement. -->
          {#if large && service === 'ytmusic'}
            <button
              type="button"
              class="icon"
              class:on={track.like === 'dislike'}
              aria-label="Je n'aime pas"
              aria-pressed={track.like === 'dislike'}
              title="Je n'aime pas"
              onclick={() => control('dislike')}
            >
              <ThumbsDownIcon size={18} weight={track.like === 'dislike' ? 'fill' : 'regular'} />
            </button>
          {/if}
          <button
            type="button"
            class="icon"
            class:on={track.like === 'like'}
            aria-label="J'aime"
            aria-pressed={track.like === 'like'}
            title="J'aime"
            onclick={() => control('like')}
          >
            <ThumbsUpIcon size={18} weight={track.like === 'like' ? 'fill' : 'regular'} />
          </button>
        {/if}
        <button
          type="button"
          class="icon"
          aria-label="Ouvrir {name}"
          title="Ouvrir {name}"
          onclick={() => source.open()}
        >
          <ArrowSquareOutIcon size={18} />
        </button>
      </div>
      <div class="progress">
        <span>{clock(dragTime ?? track.time)}</span>
        <input
          type="range"
          aria-label="Position dans le morceau"
          min="0"
          max={track.duration || 1}
          step="1"
          disabled={!track.canSeek}
          value={dragTime ?? track.time}
          style:--fill="{((dragTime ?? track.time) / (track.duration || 1)) * 100}%"
          oninput={(event) => (dragTime = event.currentTarget.valueAsNumber)}
          onchange={async (event) => {
            await source.seek(event.currentTarget.valueAsNumber)
            dragTime = null
          }}
        />
        <span>{clock(track.duration)}</span>
      </div>
      <div class="controls">
        {#if large && track.shuffle !== null}
          <button
            type="button"
            class="icon"
            class:on={track.shuffle}
            aria-label="Lecture aléatoire"
            aria-pressed={track.shuffle}
            title="Lecture aléatoire"
            onclick={() => control('shuffle')}
          >
            <ShuffleIcon size={18} />
          </button>
        {/if}
        <button
          type="button"
          class="icon"
          aria-label="Morceau précédent"
          onclick={() => control('previous')}
        >
          <SkipBackIcon size={20} weight="fill" />
        </button>
        <button
          type="button"
          class="play"
          aria-label={track.playing ? 'Pause' : 'Lecture'}
          onclick={() => control('toggle')}
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
          onclick={() => control('next')}
        >
          <SkipForwardIcon size={20} weight="fill" />
        </button>
        {#if large && track.repeat !== null}
          <button
            type="button"
            class="icon"
            class:on={track.repeat !== 'none'}
            aria-label={track.repeat === 'one'
              ? 'Répéter : ce morceau'
              : track.repeat === 'all'
                ? 'Répéter : toute la file'
                : 'Répéter : désactivé'}
            title={track.repeat === 'one'
              ? 'Répète ce morceau'
              : track.repeat === 'all'
                ? 'Répète toute la file'
                : 'Répéter'}
            onclick={() => control('repeat')}
          >
            {#if track.repeat === 'one'}<RepeatOnceIcon size={18} />{:else}<RepeatIcon
                size={18}
              />{/if}
          </button>
        {/if}
        <!-- Volume inconnu (Spotify ne joue sur aucune sortie) : pas de curseur. -->
        {#if track.volume >= 0}
          <Volume {source} volume={track.volume} />
        {/if}
      </div>
    </div>
  </div>
  {#if large && queue.length > 1}
    <span class="label queue-label">À suivre</span>
    <ul class="queue">
      {#each queue as item (item.id)}
        <li>
          <button
            type="button"
            class="item"
            class:current={item.current}
            title={item.current ? 'En cours' : `Jouer ${item.title}`}
            disabled={item.current}
            onclick={() => source.play(item.id)}
          >
            <span class="thumb">
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
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .widget {
    position: relative;
    box-sizing: border-box;
    height: 100%;
    padding: clamp(12px, 7cqmin, 20px);
    display: flex;
    align-items: center;
    gap: clamp(12px, 5cqmin, 20px);
  }

  /* Teinte de la pochette, saturée pour ne pas virer au gris. */
  .glow {
    position: absolute;
    inset: 0;
    background: radial-gradient(
      circle at 15% 50%,
      color-mix(in srgb, var(--tint) 55%, transparent),
      transparent 75%
    );
    filter: saturate(1.6);
    pointer-events: none;
  }

  .large {
    flex-direction: column;
    align-items: stretch;
  }

  .main {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: center;
    gap: clamp(12px, 5cqmin, 20px);
  }

  .large .main {
    flex: none;
    height: clamp(120px, 38%, 200px);
  }

  .label {
    font-size: var(--text-12);
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
    color: var(--text-faint);
  }

  .queue-label {
    position: relative;
  }

  .queue {
    position: relative;
    flex: 1;
    min-height: 0;
    margin: 0;
    padding: 0;
    list-style: none;
    overflow-y: auto;
  }

  .item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 5px 6px;
    border-radius: var(--radius-row);
    text-align: left;
  }

  .item:not(:disabled):hover {
    background: var(--surface-hover);
  }

  .item:not(:disabled):active {
    transform: none;
  }

  .item:disabled {
    cursor: default;
  }

  .thumb {
    flex: none;
    width: 32px;
    height: 32px;
    display: grid;
    place-items: center;
    border-radius: var(--radius-bar);
    overflow: hidden;
    background: var(--white-6);
    color: var(--text-faint);
  }

  .thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .item-names {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .item-title,
  .item-artist {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .item-title {
    font-size: var(--text-13);
  }

  .current .item-title {
    color: var(--accent);
    font-weight: var(--weight-medium);
  }

  .item-artist {
    font-size: var(--text-12);
    color: var(--text-faint);
  }

  .item-time {
    font-size: var(--text-11);
    font-variant-numeric: tabular-nums;
    color: var(--text-faint);
  }

  .icon.on {
    color: var(--accent);
  }

  .art {
    position: relative;
    flex: none;
    height: 100%;
    max-height: 100%;
    aspect-ratio: 1;
    max-width: 45%;
    display: grid;
    place-items: center;
    border-radius: var(--radius-menu);
    overflow: hidden;
    background: var(--white-6);
    color: var(--text-faint);
    box-shadow: var(--shadow-art);
  }

  .art img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .details {
    position: relative;
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .head {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .names {
    flex: 1;
    min-width: 0;
  }

  .names p {
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .title {
    font-size: var(--text-15);
    font-weight: var(--weight-semibold);
  }

  .artist {
    font-size: var(--text-13);
    color: var(--text-muted);
  }

  /* Boutons ronds du lecteur ; .action garde son style global (app.css). :where() ne compte
     pas dans la priorité : .play et .overlay passent toujours devant. */
  button:where(:not(.action)) {
    display: grid;
    place-items: center;
    padding: 0;
    border: none;
    background: none;
    color: var(--text);
    cursor: pointer;
    transition: transform var(--dur-spring) var(--ease-spring);
  }

  button:where(:not(.action)):active {
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
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--text);
    color: var(--bg);
  }

  .progress {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: var(--text-11);
    color: var(--text-faint);
    font-variant-numeric: tabular-nums;
  }

  .controls {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .controls > :global(.volume) {
    margin-left: auto;
  }

  /* Service qui refuse qu'on change la position : barre affichée seule. */
  .progress input:disabled {
    cursor: default;
  }

  .progress input:disabled::-webkit-slider-thumb {
    opacity: 0;
  }

  button:focus-visible,
  input:focus-visible {
    outline: var(--focus-ring);
    outline-offset: var(--focus-offset);
  }

  /* Bouton posé sur la pochette : petite case seulement. */
  .overlay {
    position: absolute;
    display: none;
    background: var(--veil-art);
    color: var(--white);
  }

  /* Petite case : la pochette remplit tout, un seul bouton. */
  @container (max-width: 300px) {
    .details {
      display: none;
    }

    .art {
      max-width: none;
      margin: auto;
    }

    .overlay {
      display: grid;
    }
  }

  /* Moyenne mais étroite : bouton du son sans curseur. */
  @container (max-width: 420px) {
    .controls :global(.volume input) {
      display: none;
    }
  }
</style>
