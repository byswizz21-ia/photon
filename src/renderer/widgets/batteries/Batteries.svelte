<script lang="ts">
  // Une ligne par appareil : nom, jauge, pourcentage (éclair en charge, « Éteint » hors de portée).
  import LightningIcon from 'phosphor-svelte/lib/LightningIcon'
  import type { Battery } from '../../../shared/api'
  import { pollWhileVisible } from '../../lib/poll.svelte'
  import type { WidgetProps } from '../types'
  import type { BatteriesSettings } from './manifest'

  // Aucun réglage : props déclarées pour le type seulement (voir System.svelte).
  // eslint-disable-next-line no-empty-pattern
  let {}: WidgetProps<BatteriesSettings> = $props()

  let devices = $state.raw<Battery[] | null>(null)
  let failed = $state(false)

  pollWhileVisible(async () => {
    const next = await window.photon.batteries()
    if (next) devices = next
    failed = !next && !devices
  }, 30_000)
</script>

<div class="widget">
  <span class="label">Batteries</span>
  {#if devices?.length}
    <ul>
      {#each devices as device (device.name)}
        <li class:low={device.level !== null && device.level <= 25 && !device.charging}>
          <span class="name">{device.name}</span>
          {#if device.level === null}
            <span class="off">Éteint</span>
          {:else}
            <span class="gauge" style:--level="{device.level}%"></span>
            <span class="value">
              {#if device.charging}<LightningIcon
                  size={12}
                  weight="fill"
                  aria-label="En charge"
                />{/if}
              {device.level} %
            </span>
          {/if}
        </li>
      {/each}
    </ul>
  {:else if devices || failed}
    <p class="empty">{failed ? 'Lecture impossible' : 'Aucun appareil reconnu branché'}</p>
  {/if}
</div>

<style>
  .widget {
    box-sizing: border-box;
    height: 100%;
    padding: clamp(12px, 9cqmin, 20px);
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .label {
    font-size: 12px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-faint);
  }

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 10px;
    overflow-y: auto;
  }

  li {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 6px 10px;
  }

  .name {
    font-size: 14px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .value,
  .off {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;
    font-variant-numeric: tabular-nums;
    color: var(--text-muted);
  }

  .gauge {
    grid-column: 1 / -1;
    grid-row: 2;
    height: 4px;
    border-radius: 2px;
    background: linear-gradient(90deg, var(--accent) var(--level), rgb(255 255 255 / 0.1) 0);
  }

  .low .gauge {
    background: linear-gradient(90deg, #ff9aa8 var(--level), rgb(255 255 255 / 0.1) 0);
  }

  .empty {
    margin: 0;
    font-size: 13px;
    color: var(--text-faint);
  }
</style>
