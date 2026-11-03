<script lang="ts">
  // Design « Mélangeur » (6×3) : volume général en 32 segments (clic = ce niveau), sorties en
  // pastilles, et à droite le volume de chaque app qui joue du son (mélangeur de Windows).
  import AppWindowIcon from 'phosphor-svelte/lib/AppWindowIcon'
  import BellIcon from 'phosphor-svelte/lib/BellIcon'
  import SpeakerHighIcon from 'phosphor-svelte/lib/SpeakerHighIcon'
  import SpeakerLowIcon from 'phosphor-svelte/lib/SpeakerLowIcon'
  import SpeakerSlashIcon from 'phosphor-svelte/lib/SpeakerSlashIcon'
  import { SvelteMap } from 'svelte/reactivity'
  import type { AudioApp, AudioState } from '../../../shared/api'
  import { pollWhileVisible } from '../../lib/poll.svelte'
  import RollingNumber from '../../lib/RollingNumber.svelte'
  import { deviceKind, split } from './devices'
  import { DEVICE_ICONS, type Sound } from './sound.svelte'

  let { sound, audio }: { sound: Sound; audio: AudioState } = $props()

  const SEGMENTS = 32
  const LEVELS = Array.from({ length: SEGMENTS }, (_, i) => i)
  const lit = $derived(Math.round((sound.volume / 100) * SEGMENTS))
  const current = $derived(audio.devices.find((d) => d.id === audio.current))

  // Apps : relues chaque seconde ; icône de l'exe demandée une fois par app.
  let apps = $state.raw<AudioApp[]>([])
  let dragging = $state<{ id: string; volume: number } | null>(null)
  const icons = new SvelteMap<string, string | null>()
  pollWhileVisible(async () => {
    const next = await window.photon.audioApps()
    if (!next) return
    apps = next
    for (const app of next) {
      if (icons.has(app.id) || app.id === '~system') continue
      icons.set(app.id, null)
      void window.photon.audioAppIcon(app.id).then((icon) => icons.set(app.id, icon))
    }
  }, 1_000)

  async function setApp(id: string, volume: number): Promise<void> {
    dragging = { id, volume }
    const next = await window.photon.audioAppVolume(id, volume)
    if (next) apps = next
  }
</script>

<div class="widget" data-no-press>
  <div class="main" onwheel={sound.wheel}>
    <div class="head">
      <span class="label">Son</span>
      <span class="faint" title={current?.name}>{current?.name ?? ''}</span>
    </div>
    <div class="level">
      <span class="num" class:muted={audio.muted}
        ><RollingNumber value={String(sound.volume)} /></span
      >
      <span class="unit">{audio.muted ? 'muet' : '%'}</span>
      <button
        type="button"
        class="round mute"
        class:on={audio.muted}
        aria-label={audio.muted ? 'Rétablir le son' : 'Couper le son'}
        aria-pressed={audio.muted}
        onclick={sound.mute}
      >
        {#if audio.muted}<SpeakerSlashIcon size={18} />{:else if sound.volume < 50}<SpeakerLowIcon
            size={18}
          />{:else}<SpeakerHighIcon size={18} />{/if}
      </button>
    </div>
    <div class="segs" class:muted={audio.muted} data-no-drag>
      {#each LEVELS as i (i)}
        <button
          type="button"
          class="seg"
          class:on={i < lit}
          class:last={i === lit - 1}
          style:--o={0.45 + (0.55 * (i + 1)) / Math.max(lit, 1)}
          aria-label="Volume {Math.round(((i + 1) / SEGMENTS) * 100)} %"
          onclick={() => sound.set(((i + 1) / SEGMENTS) * 100)}
        ></button>
      {/each}
    </div>
    <div class="outputs">
      {#each audio.devices as device (device.id)}
        {@const Icon = DEVICE_ICONS[deviceKind(device.name)]}
        {@const on = device.id === audio.current}
        <button
          type="button"
          class="pill"
          class:on
          aria-pressed={on}
          title={device.name}
          aria-label={device.name}
          onclick={() => sound.device(device.id)}
        >
          <Icon size={16} weight={on ? 'duotone' : 'regular'} />
          {#if on}<span>{split(device.name)[0]}</span>{/if}
        </button>
      {/each}
    </div>
  </div>
  <div class="apps">
    <span class="label">Apps</span>
    <ul>
      {#each apps as app (app.id)}
        {@const value = dragging?.id === app.id ? dragging.volume : app.volume}
        {@const icon = icons.get(app.id)}
        <li>
          <div class="app">
            <span class="tile">
              {#if icon}<img src={icon} alt="" />{:else if app.id === '~system'}<BellIcon
                  size={16}
                  weight="duotone"
                />{:else}<AppWindowIcon size={16} weight="duotone" />{/if}
            </span>
            <span class="name" title={app.name}>{app.name}</span>
            <span class="value">{value}</span>
          </div>
          <div class="slider" style:--fill="{value}%">
            <input
              type="range"
              min="0"
              max="100"
              {value}
              aria-label="Volume de {app.name}"
              data-no-drag
              oninput={(event) => setApp(app.id, event.currentTarget.valueAsNumber)}
              onchange={() => (dragging = null)}
            />
          </div>
        </li>
      {:else}
        <li class="none">Aucune app ne joue de son.</li>
      {/each}
    </ul>
  </div>
</div>

<style>
  .widget {
    box-sizing: border-box;
    height: 100%;
    padding: 20px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 220px;
    gap: 32px;
  }

  .main {
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }

  .label {
    font-size: var(--text-12);
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
    color: var(--text-faint);
  }

  .faint {
    max-width: 180px;
    font-size: var(--text-12);
    color: var(--text-faint);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .level {
    display: flex;
    align-items: flex-end;
    gap: 12px;
  }

  .num {
    font-size: 64px;
    font-weight: var(--weight-light);
    letter-spacing: var(--tracking-display);
    line-height: 0.9;
    transition: opacity var(--dur-hover) var(--ease-out);
  }

  .num.muted {
    opacity: 0.35;
  }

  .unit {
    margin-bottom: 6px;
    font-size: var(--text-15);
    color: var(--text-muted);
  }

  button {
    padding: 0;
    font: inherit;
    cursor: pointer;
    transition: transform var(--dur-spring) var(--ease-spring);
  }

  button:focus-visible {
    outline: var(--focus-ring);
    outline-offset: var(--focus-offset);
  }

  .round,
  .pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: 1px solid var(--line);
    background: var(--white-5);
    color: var(--text-muted);
  }

  .round:active,
  .pill:active {
    transform: scale(0.94);
    transition-duration: var(--dur-press);
  }

  .mute {
    margin-left: auto;
    margin-bottom: 2px;
    width: 36px;
    height: 36px;
    border-radius: 50%;
  }

  .mute.on {
    border-color: var(--danger-border);
    background: var(--danger-surface);
    color: var(--danger-text);
  }

  .segs {
    display: flex;
    gap: 3px;
    height: 30px;
  }

  .seg {
    flex: 1;
    border: 0;
    border-radius: 3px;
    background: var(--white-8);
    transition: none;
  }

  .seg.on {
    background: var(--accent);
    opacity: var(--o);
  }

  .seg.last {
    box-shadow: 0 0 12px var(--accent);
  }

  .segs.muted .seg.on {
    background: var(--white-18);
    opacity: 1;
    box-shadow: none;
  }

  .outputs {
    display: flex;
    gap: 6px;
    min-width: 0;
  }

  .pill {
    flex: none;
    width: 34px;
    height: 34px;
    border-radius: var(--radius-pill);
  }

  .pill.on {
    width: auto;
    min-width: 0;
    flex: 0 1 auto;
    padding: 0 14px 0 12px;
    border-color: var(--border-accent-soft);
    background: var(--surface-accent-soft);
    color: var(--text);
  }

  .pill span {
    font-size: var(--text-13);
    font-weight: var(--weight-medium);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .apps {
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  ul {
    flex: 1;
    min-height: 0;
    margin: 0;
    padding: 0;
    list-style: none;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  li {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .app {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .tile {
    flex: none;
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
    border-radius: var(--radius-icon);
    background: var(--surface-icon-tile);
    color: var(--accent);
  }

  .tile img {
    width: 18px;
    height: 18px;
  }

  .name {
    flex: 1;
    min-width: 0;
    font-size: var(--text-13);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .value {
    font-size: var(--text-12);
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }

  /* Curseur fin (4 px) ; la zone cliquable déborde au-dessus et en dessous. */
  .slider {
    position: relative;
    height: 4px;
    margin-left: 38px;
    border-radius: 2px;
    background: linear-gradient(to right, var(--text) var(--fill), var(--white-15) var(--fill));
  }

  .slider input {
    position: absolute;
    left: 0;
    top: -8px;
    width: 100%;
    height: 20px;
    margin: 0;
    opacity: 0;
    cursor: pointer;
  }

  .none {
    font-size: var(--text-12);
    color: var(--text-faint);
  }
</style>
