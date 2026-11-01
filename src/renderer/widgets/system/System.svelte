<script lang="ts">
  // Charge CPU et RAM, relue toutes les 2 s tant que Photon est affiché.
  import type { CpuRam } from '../../../shared/api'
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

  const cpu = $derived(stats ? percent(stats.cpu) : null)
  const ram = $derived(stats ? percent((100 * stats.ramUsed) / stats.ramTotal) : null)
  const ramDetail = $derived(
    stats && ram !== null ? `${go(stats.ramUsed)} / ${go(stats.ramTotal)} Go` : ''
  )
</script>

{#snippet measure(name: string, value: number | null, detail = '')}
  <div class="measure">
    <div class="row">
      <span class="name">{name}</span>
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
  {@render measure('CPU', cpu)}
  {@render measure('RAM', ram, ramDetail)}
</div>

<style>
  /* Marges et écarts rétrécissent avec la carte : tout tient dans un 2×2 compact (146 px de haut). */
  .widget {
    box-sizing: border-box;
    height: 100%;
    padding: clamp(12px, 13.5cqmin, 24px);
    display: flex;
    flex-direction: column;
    gap: clamp(8px, 7.9cqh, 14px);
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

  /* Détail de la RAM : seulement si la carte a la place (jamais en 2×2 compact). */
  .detail {
    display: none;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    color: var(--text-faint);
  }

  @container (min-height: 165px) and (min-width: 140px) {
    .detail {
      display: block;
    }
  }
</style>
