<script lang="ts">
  // Débit réseau : deux valeurs et la courbe des 30 dernières secondes (réception).
  import ArrowDownIcon from 'phosphor-svelte/lib/ArrowDownIcon'
  import ArrowUpIcon from 'phosphor-svelte/lib/ArrowUpIcon'
  import type { NetworkRate } from '../../../shared/api'
  import { pollWhileVisible } from '../../lib/poll.svelte'
  import type { WidgetProps } from '../types'
  import type { NetworkSettings } from './manifest'

  // Aucun réglage : props déclarées pour le type seulement (voir System.svelte).
  // eslint-disable-next-line no-empty-pattern
  let {}: WidgetProps<NetworkSettings> = $props()

  const POINTS = 30

  let rate = $state.raw<NetworkRate | null>(null)
  let history = $state.raw<number[]>([])

  pollWhileVisible(async () => {
    const next = await window.photon.network()
    if (!next) return // 1re lecture : la suivante donne le débit
    rate = next
    history = [...history, next.down].slice(-POINTS)
  }, 1_000)

  // 1 Mo = 1000² octets, comme le Gestionnaire des tâches ; débit en octets, pas en bits.
  function format(bytes: number): string {
    if (bytes < 1000) return `${Math.round(bytes)} o/s`
    if (bytes < 1000 ** 2) return `${Math.round(bytes / 1000)} Ko/s`
    return `${(bytes / 1000 ** 2).toFixed(1).replace('.', ',')} Mo/s`
  }

  // Courbe dans un repère 100 × 30, mise à l'échelle du pic visible.
  const path = $derived.by(() => {
    if (history.length < 2) return ''
    const peak = Math.max(...history, 1)
    const step = 100 / (POINTS - 1)
    const start = POINTS - history.length
    return history
      .map(
        (v, i) =>
          `${i ? 'L' : 'M'}${((start + i) * step).toFixed(1)},${(30 - (v / peak) * 28).toFixed(1)}`
      )
      .join(' ')
  })
</script>

<div class="widget">
  <span class="label">Réseau</span>
  <div class="rates">
    <p>
      <ArrowDownIcon size={14} weight="bold" aria-label="Reçu" />
      {rate ? format(rate.down) : '—'}
    </p>
    <p class="up">
      <ArrowUpIcon size={14} weight="bold" aria-label="Envoyé" />
      {rate ? format(rate.up) : '—'}
    </p>
  </div>
  <svg viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
    {#if path}
      <path
        class="area"
        d="{path} L100,30 L{((POINTS - history.length) * 100) / (POINTS - 1)},30 Z"
      />
      <path class="line" d={path} />
    {/if}
  </svg>
</div>

<style>
  .widget {
    box-sizing: border-box;
    height: 100%;
    padding: clamp(12px, 9cqmin, 20px);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .label {
    font-size: 12px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-faint);
  }

  .rates {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 16px;
  }

  p {
    margin: 0;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: clamp(14px, 8cqmin, 20px);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .up {
    color: var(--text-muted);
  }

  svg {
    flex: 1;
    min-height: 0;
    width: 100%;
  }

  .line {
    fill: none;
    stroke: var(--accent);
    stroke-width: 1.5;
    vector-effect: non-scaling-stroke;
  }

  .area {
    fill: color-mix(in srgb, var(--accent) 18%, transparent);
  }
</style>
