<script lang="ts">
  // Volume d'un lecteur de musique : bouton couper / rétablir le son et curseur. Couleur : celle
  // du service, passée en `tint` (curseur rempli, icône au survol). Aucun service ne dit s'il est
  // muet : couper = volume 0, rétablir = volume d'avant (50 % si on ne l'a pas vu). Sans `tint` :
  // couleur du texte (ne pas écrire --text: var(--text), variable qui se cite = invalide).
  import SpeakerHighIcon from 'phosphor-svelte/lib/SpeakerHighIcon'
  import SpeakerLowIcon from 'phosphor-svelte/lib/SpeakerLowIcon'
  import SpeakerSlashIcon from 'phosphor-svelte/lib/SpeakerSlashIcon'
  import type { MusicSource } from './source.svelte'

  let {
    source,
    volume,
    width = 72,
    tint
  }: { source: MusicSource; volume: number; width?: number; tint?: string } = $props()

  let drag = $state<number | null>(null)
  let before = 50
  const value = $derived(drag ?? volume)
  const muted = $derived(value === 0)

  async function set(next: number): Promise<void> {
    await window.photon.musicVolume(source.service, next)
    await source.read()
  }

  function toggle(): void {
    if (muted) return void set(before)
    before = value
    void set(0)
  }
</script>

<div class="volume" style:--text={tint} data-no-drag>
  <button
    type="button"
    aria-label={muted ? 'Rétablir le son' : `Couper le son · ${value} %`}
    title={muted ? 'Rétablir le son' : `Couper le son · ${value} %`}
    aria-pressed={muted}
    onclick={toggle}
  >
    {#if muted}<SpeakerSlashIcon size={18} />{:else if value < 50}<SpeakerLowIcon
        size={18}
      />{:else}<SpeakerHighIcon size={18} />{/if}
  </button>
  <input
    type="range"
    min="0"
    max="100"
    aria-label="Volume"
    aria-valuetext="{value} %"
    {value}
    style:--fill="{value}%"
    style:width="{width}px"
    oninput={(event) => {
      drag = event.currentTarget.valueAsNumber
      void window.photon.musicVolume(source.service, drag)
    }}
    onchange={async () => {
      await source.read()
      drag = null
    }}
  />
</div>

<style>
  .volume {
    flex: none;
    display: flex;
    align-items: center;
    gap: 2px;
  }

  button {
    flex: none;
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: none;
    color: var(--text-muted);
    cursor: pointer;
    transition: transform var(--dur-spring) var(--ease-spring);
  }

  button:hover,
  button[aria-pressed='true'] {
    color: var(--text);
    background: var(--white-8);
  }

  button:active {
    transform: scale(0.9);
    transition-duration: var(--dur-press);
  }

  button:focus-visible,
  input:focus-visible {
    outline: var(--focus-ring);
    outline-offset: var(--focus-offset);
  }

  input {
    flex: none;
  }
</style>
