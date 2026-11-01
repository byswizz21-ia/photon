<script lang="ts">
  // Charge CPU, RAM et GPU + températures, relues toutes les 2 s tant que Photon est affiché.
  import type { CpuRam, Temperatures } from '../../../shared/api'
  import { pollWhileVisible } from '../../lib/poll.svelte'
  import RollingNumber from '../../lib/RollingNumber.svelte'
  import type { WidgetProps } from '../types'
  import type { SystemSettings } from './manifest'

  // Aucun réglage : les props de Photon (settings, editing, save) sont déclarées pour le type,
  // sans être lues. Sans cette ligne, le composant serait typé « aucune prop » et refusé par le manifest.
  // eslint-disable-next-line no-empty-pattern
  let {}: WidgetProps<SystemSettings> = $props()

  // Go = 1024³ octets, écrit à la française (« 31,8 »).
  const gigabytes = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
    useGrouping: false
  })
  const go = (bytes: number): string => gigabytes.format(bytes / 1024 ** 3)

  // Pourcentage entier de 0 à 100, ou null si ce n'est pas un nombre (division par zéro, etc.).
  const percent = (value: number): number | null =>
    Number.isFinite(value) ? Math.round(Math.min(100, Math.max(0, value))) : null

  // null : pas encore de lecture, ou dernière lecture en échec (tirets, barres vides).
  let stats = $state<CpuRam | null>(null)

  pollWhileVisible(async () => {
    try {
      stats = await window.photon.cpuRam()
    } catch (error) {
      stats = null
      throw error // pollWhileVisible l'écrit dans le log
    }
  }, 2000)

  // Lecture séparée : nvidia-smi (≈ 70 ms) ne retarde pas CPU / RAM.
  let temps = $state<Temperatures | null>(null)

  pollWhileVisible(async () => {
    try {
      temps = await window.photon.temperatures()
    } catch (error) {
      temps = null
      throw error
    }
  }, 2000)

  const degrees = (value: number | null | undefined): string =>
    value == null ? '' : `${Math.round(value)}°`

  const cpu = $derived(stats ? percent(stats.cpu) : null)
  const ram = $derived(stats ? percent((100 * stats.ramUsed) / stats.ramTotal) : null)
  const gpu = $derived(temps?.gpuLoad == null ? null : percent(temps.gpuLoad))
  const cpuHint = $derived(
    temps && !temps.lhm
      ? 'Température CPU : lancer LibreHardwareMonitor avec son serveur web (port 8085)'
      : undefined
  )
  const ramDetail = $derived(
    stats && ram !== null ? `${go(stats.ramUsed)} / ${go(stats.ramTotal)} Go` : ''
  )
</script>

{#snippet measure(name: string, value: number | null, detail = '', temp = '', hint?: string)}
  <div class="measure" title={hint}>
    <div class="row">
      <span class="name">{name}</span>
      {#if temp}<span class="temp">{temp}</span>{/if}
      <span class="value">
        {#if value === null}—{:else}<RollingNumber value={String(value)} />&nbsp;%{/if}
      </span>
    </div>
    <div class="bar" aria-hidden="true">
      <div class="fill" style:transform="scaleX({(value ?? 0) / 100})"></div>
    </div>
    {#if detail}<span class="detail">{detail}</span>{/if}
  </div>
{/snippet}

<div class="widget">
  <span class="label">Système</span>
  {@render measure('CPU', cpu, '', degrees(temps?.cpu), cpuHint)}
  {@render measure('RAM', ram, ramDetail)}
  {#if gpu !== null || temps?.gpu != null}
    {@render measure('GPU', gpu, '', degrees(temps?.gpu))}
  {/if}
</div>

<style>
  /* Marges et écarts rétrécissent avec la carte : CPU, RAM et GPU tiennent dans un 2×2 compact
     (146 px de haut). */
  .widget {
    box-sizing: border-box;
    height: 100%;
    padding: clamp(12px, 10cqmin, 24px);
    display: flex;
    flex-direction: column;
    gap: clamp(6px, 4.5cqh, 14px);
    line-height: 1.3;
  }

  .label {
    font-size: 12px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-faint);
  }

  .measure {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .row {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    font-size: 13px;
  }

  .name {
    color: var(--text-muted);
  }

  /* Température : poussée à droite, juste avant le pourcentage. */
  .temp {
    margin-left: auto;
    font-variant-numeric: tabular-nums;
    color: var(--text-faint);
  }

  .value {
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .bar {
    height: 4px;
    border-radius: 4px;
    background: rgb(255 255 255 / 0.12);
  }

  /* Remplissage : jamais la largeur, seulement scaleX depuis la gauche. */
  .fill {
    height: 100%;
    border-radius: inherit;
    background: var(--accent);
    box-shadow: 0 0 10px var(--accent);
    transform-origin: left;
    transition: transform 400ms var(--ease-out);
  }

  /* Détail de la RAM : seulement si la carte a la place (3 lignes de haut et plus). */
  .detail {
    display: none;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    color: var(--text-faint);
  }

  @container (min-height: 200px) and (min-width: 140px) {
    .detail {
      display: block;
    }
  }
</style>
