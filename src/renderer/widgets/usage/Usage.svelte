<script lang="ts">
  // Tokens de Claude Code dans la fenêtre de 5 h en cours (et sa fin), aujourd'hui, sur 7 jours.
  // Relu toutes les 30 s fenêtre visible ; la 1re lecture parcourt les journaux (quelques s).
  import type { ClaudeUsage } from '../../../shared/api'
  import { pollWhileVisible } from '../../lib/poll.svelte'
  import type { WidgetProps } from '../types'
  import type { UsageSettings } from './manifest'

  // Aucun réglage : props déclarées pour le type seulement (voir System.svelte).
  // eslint-disable-next-line no-empty-pattern
  let {}: WidgetProps<UsageSettings> = $props()

  let usage = $state.raw<ClaudeUsage | null>(null)
  let now = $state(Date.now())

  pollWhileVisible(async () => {
    usage = await window.photon.claudeUsage()
    now = Date.now()
  }, 30_000)

  // 1 234 567 → « 1,2 M »
  const compact = new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 })

  function left(at: number): string {
    const minutes = Math.max(0, Math.ceil((at - now) / 60_000))
    return minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60}` : `${minutes} min`
  }
</script>

<div class="widget">
  <span class="label">Claude</span>
  {#if !usage}
    <p class="empty">Lecture des journaux…</p>
  {:else if !usage.sources}
    <p class="empty">Aucun journal de Claude Code trouvé</p>
  {:else}
    <div class="session">
      <span class="value">{compact.format(usage.session)}</span>
      <span class="unit">tokens</span>
    </div>
    <p class="sub">
      {#if usage.resetsAt}
        Session · {usage.messages} réponses · fin dans {left(usage.resetsAt)}
      {:else}
        Aucune session en cours
      {/if}
    </p>
    <dl>
      <div>
        <dt>Aujourd'hui</dt>
        <dd>{compact.format(usage.today)}</dd>
      </div>
      <div>
        <dt>7 jours</dt>
        <dd>{compact.format(usage.week)}</dd>
      </div>
    </dl>
  {/if}
</div>

<style>
  .widget {
    box-sizing: border-box;
    height: 100%;
    padding: clamp(12px, 9cqmin, 20px);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .label {
    font-size: 12px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-faint);
  }

  .session {
    display: flex;
    align-items: baseline;
    gap: 6px;
  }

  .value {
    font-size: clamp(24px, 16cqmin, 40px);
    font-weight: 300;
    font-variant-numeric: tabular-nums;
  }

  .unit,
  .sub,
  dt {
    font-size: 12px;
    color: var(--text-muted);
  }

  .sub {
    margin: 0;
  }

  dl {
    margin: auto 0 0;
    display: flex;
    gap: 20px;
  }

  dd {
    margin: 0;
    font-size: 15px;
    font-variant-numeric: tabular-nums;
  }

  .empty {
    margin: 0;
    color: var(--text-faint);
  }
</style>
