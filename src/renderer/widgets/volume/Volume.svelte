<script lang="ts">
  // Son de Windows (src/main/audio.ts), relu chaque seconde fenêtre visible : volume (curseur ou
  // molette), muet, et sorties actives (l'actuelle en tête) — un clic en fait la sortie par défaut.
  import SpeakerHighIcon from 'phosphor-svelte/lib/SpeakerHighIcon'
  import SpeakerLowIcon from 'phosphor-svelte/lib/SpeakerLowIcon'
  import SpeakerSlashIcon from 'phosphor-svelte/lib/SpeakerSlashIcon'
  import type { AudioState } from '../../../shared/api'
  import { pollWhileVisible } from '../../lib/poll.svelte'
  import type { WidgetProps } from '../types'
  import type { VolumeSettings } from './manifest'

  // Aucun réglage : props déclarées pour le type seulement (voir System.svelte).
  // eslint-disable-next-line no-empty-pattern
  let {}: WidgetProps<VolumeSettings> = $props()

  let audio = $state.raw<AudioState | null>(null)
  let failed = $state(false)
  // Curseur tenu par la souris : on n'écrase pas sa position avec la lecture suivante.
  let dragVolume = $state<number | null>(null)

  function apply(next: AudioState | null): void {
    if (next) audio = next
    failed = !next && !audio
  }

  pollWhileVisible(async () => apply(await window.photon.audio()), 1_000)

  const volume = $derived(dragVolume ?? audio?.volume ?? 0)
  // Sortie active en tête : visible même quand la case est petite et la liste défile.
  const devices = $derived(
    (audio?.devices ?? []).toSorted(
      (a, b) => Number(b.id === audio?.current) - Number(a.id === audio?.current)
    )
  )

  // Comme le volume de Windows : bouger le curseur rétablit le son coupé.
  async function setVolume(value: number): Promise<void> {
    if (audio?.muted) void window.photon.audioMute(false)
    apply(await window.photon.audioVolume(value))
  }

  function wheel(event: WheelEvent): void {
    if (!audio || event.deltaY === 0) return
    void setVolume(Math.min(100, Math.max(0, audio.volume - Math.sign(event.deltaY) * 2)))
  }

  // « Casque (Realtek Audio) » → nom « Casque », détail « Realtek Audio ».
  function split(name: string): [string, string] {
    const match = /^(.*) \(([^()]*)\)$/.exec(name)
    return match ? [match[1]!, match[2]!] : [name, '']
  }
</script>

<div class="widget" data-no-press>
  <span class="label">Son</span>
  {#if audio}
    <div class="level" onwheel={wheel}>
      <button
        type="button"
        class="mute"
        aria-label={audio.muted ? 'Rétablir le son' : 'Couper le son'}
        aria-pressed={audio.muted}
        onclick={async () => apply(await window.photon.audioMute(!audio?.muted))}
      >
        {#if audio.muted}
          <SpeakerSlashIcon size={20} />
        {:else if volume < 50}
          <SpeakerLowIcon size={20} />
        {:else}
          <SpeakerHighIcon size={20} />
        {/if}
      </button>
      <input
        type="range"
        aria-label="Volume"
        min="0"
        max="100"
        value={volume}
        class:muted={audio.muted}
        style:--fill="{volume}%"
        oninput={(event) => {
          dragVolume = event.currentTarget.valueAsNumber
          void setVolume(dragVolume)
        }}
        onchange={async () => {
          apply(await window.photon.audio()) // après le dernier réglage (commandes dans l'ordre)
          dragVolume = null
        }}
      />
      <span class="value">{volume}</span>
    </div>
    <ul class="devices" aria-label="Sortie audio">
      {#each devices as device (device.id)}
        {@const [name, detail] = split(device.name)}
        <li>
          <button
            type="button"
            class:current={device.id === audio.current}
            aria-pressed={device.id === audio.current}
            title={device.name}
            onclick={async () => apply(await window.photon.audioDevice(device.id))}
          >
            <span class="name">{name}</span>
            {#if detail}<span class="detail">{detail}</span>{/if}
          </button>
        </li>
      {/each}
    </ul>
  {:else if failed}
    <p class="empty">Son indisponible</p>
  {/if}
</div>

<style>
  .widget {
    box-sizing: border-box;
    height: 100%;
    padding: clamp(12px, 8cqmin, 20px);
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .label {
    font-size: var(--text-12);
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
    color: var(--text-faint);
  }

  .level {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  button {
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }

  .mute {
    flex: none;
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    transition: transform var(--dur-spring) var(--ease-spring);
  }

  .mute:hover {
    background: var(--white-8);
  }

  .mute:active {
    transform: scale(0.92);
    transition-duration: var(--dur-press);
  }

  input.muted {
    opacity: 0.4;
  }

  .value {
    flex: none;
    min-width: 3ch;
    text-align: right;
    font-size: var(--text-13);
    font-variant-numeric: tabular-nums;
    color: var(--text-muted);
  }

  .devices {
    flex: 1;
    min-height: 0;
    margin: 0;
    padding: 0;
    list-style: none;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .devices button {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 6px 10px;
    border: 1px solid transparent;
    border-radius: var(--radius-input);
    text-align: left;
    color: var(--text-muted);
  }

  .devices button:hover {
    color: var(--text);
    background: var(--white-6);
  }

  .devices .current {
    border-color: var(--border-accent-soft);
    background: var(--surface-accent-soft);
    color: var(--text);
  }

  .name,
  .detail {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .name {
    font-size: var(--text-13);
  }

  .detail {
    font-size: var(--text-11);
    color: var(--text-faint);
  }

  .empty {
    margin: 0;
    color: var(--text-faint);
  }
</style>
