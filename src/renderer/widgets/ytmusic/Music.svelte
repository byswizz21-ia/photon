<script lang="ts">
  // Morceau en cours de YT Music (lecteur caché, src/main/music.ts), relu chaque seconde
  // fenêtre visible. Petite case : pochette + lecture ; plus grande : titre, progression, volume.
  // La couleur de la pochette teinte le fond du widget.
  import ArrowSquareOutIcon from 'phosphor-svelte/lib/ArrowSquareOutIcon'
  import MusicNotesIcon from 'phosphor-svelte/lib/MusicNotesIcon'
  import PauseIcon from 'phosphor-svelte/lib/PauseIcon'
  import PlayIcon from 'phosphor-svelte/lib/PlayIcon'
  import SkipBackIcon from 'phosphor-svelte/lib/SkipBackIcon'
  import SkipForwardIcon from 'phosphor-svelte/lib/SkipForwardIcon'
  import SpeakerHighIcon from 'phosphor-svelte/lib/SpeakerHighIcon'
  import type { MusicCommand, MusicState } from '../../../shared/api'
  import { pollWhileVisible } from '../../lib/poll.svelte'
  import type { WidgetProps } from '../types'
  import type { MusicSettings } from './manifest'

  // Aucun réglage : props déclarées pour le type seulement (voir System.svelte).
  // eslint-disable-next-line no-empty-pattern
  let {}: WidgetProps<MusicSettings> = $props()

  let music = $state.raw<MusicState>()
  // Curseur tenu par la souris : on n'écrase pas sa position avec la lecture suivante.
  let dragTime = $state<number | null>(null)
  let dragVolume = $state<number | null>(null)
  let tint = $state('')

  const read = async (): Promise<void> => {
    music = await window.photon.music()
  }
  pollWhileVisible(read, 1_000)

  const track = $derived(music?.track ?? null)

  async function control(command: MusicCommand): Promise<void> {
    await window.photon.musicControl(command)
    setTimeout(() => void read(), 250) // YT Music met l'état à jour après le clic
  }

  // Couleur moyenne de la pochette : l'image réduite à 1 pixel.
  $effect(() => {
    const src = track?.artwork
    if (!src) return
    const image = new Image()
    image.onload = () => {
      const context = document.createElement('canvas').getContext('2d')
      if (!context) return
      context.drawImage(image, 0, 0, 1, 1)
      const [r, g, b] = context.getImageData(0, 0, 1, 1).data
      tint = `rgb(${r} ${g} ${b})`
    }
    image.src = src
  })

  const clock = (seconds: number): string => {
    const s = Math.max(0, Math.floor(seconds))
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  }
</script>

<div class="widget" style:--tint={tint || 'transparent'} data-no-press>
  <span class="glow" aria-hidden="true"></span>
  {#if !music?.ready}
    <p class="message">Chargement de YT Music…</p>
  {:else if !track}
    <!-- Sans compte, YT Music joue quand même : la connexion n'est proposée que si rien ne joue. -->
    <div class="message">
      <p>{music.signedIn ? 'Rien en cours' : 'Connecte ton compte Google une fois.'}</p>
      <button
        type="button"
        class="action"
        class:primary={!music.signedIn}
        onclick={() => window.photon.musicOpen()}
      >
        {#if music.signedIn}<ArrowSquareOutIcon size={16} aria-hidden="true" /> Ouvrir YT Music
        {:else}Se connecter{/if}
      </button>
    </div>
  {:else}
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
        <button
          type="button"
          class="icon"
          aria-label="Ouvrir YT Music"
          title="Ouvrir YT Music"
          onclick={() => window.photon.musicOpen()}
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
          value={dragTime ?? track.time}
          style:--fill="{((dragTime ?? track.time) / (track.duration || 1)) * 100}%"
          oninput={(event) => (dragTime = event.currentTarget.valueAsNumber)}
          onchange={async (event) => {
            await window.photon.musicSeek(event.currentTarget.valueAsNumber)
            await read()
            dragTime = null
          }}
        />
        <span>{clock(track.duration)}</span>
      </div>
      <div class="controls">
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
        <label class="volume">
          <SpeakerHighIcon size={16} aria-hidden="true" />
          <input
            type="range"
            aria-label="Volume"
            min="0"
            max="100"
            value={dragVolume ?? track.volume}
            style:--fill="{dragVolume ?? track.volume}%"
            oninput={(event) => {
              dragVolume = event.currentTarget.valueAsNumber
              void window.photon.musicVolume(dragVolume)
            }}
            onchange={async () => {
              await read()
              dragVolume = null
            }}
          />
        </label>
      </div>
    </div>
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

  .message {
    position: relative;
    margin: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    text-align: center;
    font-size: var(--text-13);
    color: var(--text-faint);
  }

  .message p {
    margin: 0;
  }

  .art {
    position: relative;
    flex: none;
    height: 100%;
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

  button {
    display: grid;
    place-items: center;
    padding: 0;
    border: none;
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

  .volume {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--text-muted);
  }

  .volume input {
    width: 72px;
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
    background: rgb(0 0 0 / 0.45);
    color: #fff;
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

  /* Moyenne mais étroite : pas de volume. */
  @container (max-width: 420px) {
    .volume {
      display: none;
    }
  }
</style>
