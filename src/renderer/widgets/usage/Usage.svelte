<script lang="ts">
  // Tokens de Claude Code dans la fenêtre de 5 h en cours (et sa fin), aujourd'hui, sur 7 jours.
  // Relu toutes les 30 s fenêtre visible ; la 1re lecture parcourt les journaux (quelques s).
  // En édition : design et offre (budgets des designs Jauge et Tableau).
  import type { ClaudeUsage } from '../../../shared/api'
  import DesignPicker from '../../lib/DesignPicker.svelte'
  import { pollWhileVisible } from '../../lib/poll.svelte'
  import type { WidgetProps } from '../types'
  import { USAGE_DESIGNS, type UsageSettings } from './manifest'
  import { compact, left, PLANS } from './plan'
  import UsageBoard from './UsageBoard.svelte'
  import UsageGauge from './UsageGauge.svelte'

  let { settings, editing, save }: WidgetProps<UsageSettings> = $props()

  let usage = $state.raw<ClaudeUsage | null>(null)
  let now = $state(Date.now())

  pollWhileVisible(async () => {
    usage = await window.photon.claudeUsage()
    now = Date.now()
  }, 30_000)

  const fancy = $derived(settings.design === 'gauge' || settings.design === 'board')
</script>

{#if editing}
  <div class="widget">
    <DesignPicker
      designs={USAGE_DESIGNS}
      value={settings.design}
      onpick={(design) => save({ ...settings, design })}
    />
    {#if fancy}
      <span class="label">Offre Claude (limites estimées)</span>
      <DesignPicker
        designs={PLANS}
        value={settings.plan}
        label="Offre"
        onpick={(plan) => save({ ...settings, plan })}
      />
    {/if}
  </div>
{:else if usage?.sources && settings.design === 'gauge'}
  <UsageGauge {usage} {now} plan={settings.plan} />
{:else if usage?.sources && settings.design === 'board'}
  <UsageBoard {usage} {now} plan={settings.plan} />
{:else}
  <div class="widget">
    <span class="label">Claude</span>
    {#if !usage}
      <p class="empty">Lecture des journaux…</p>
    {:else if !usage.sources}
      <p class="empty">Aucun journal de Claude Code trouvé</p>
    {:else}
      <div class="session">
        <span class="value">{compact(usage.session)}</span>
        <span class="unit">tokens</span>
      </div>
      <p class="sub">
        {#if usage.resetsAt}
          Session · {usage.messages} réponses · fin dans {left(usage.resetsAt, now)}
        {:else}
          Aucune session en cours
        {/if}
      </p>
      <dl>
        <div>
          <dt>Aujourd'hui</dt>
          <dd>{compact(usage.today)}</dd>
        </div>
        <div>
          <dt>7 jours</dt>
          <dd>{compact(usage.week)}</dd>
        </div>
      </dl>
    {/if}
  </div>
{/if}

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
    font-size: var(--text-12);
    letter-spacing: var(--tracking-label);
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
    font-weight: var(--weight-light);
    font-variant-numeric: tabular-nums;
  }

  .unit,
  .sub,
  dt {
    font-size: var(--text-12);
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
    font-size: var(--text-15);
    font-variant-numeric: tabular-nums;
  }

  .empty {
    margin: 0;
    color: var(--text-faint);
  }

  /* Une seule rangée de haut : la session seulement, sur une ligne. */
  @container (max-height: 110px) {
    .widget {
      justify-content: center;
      gap: 2px;
    }

    .label,
    dl {
      display: none;
    }

    .sub {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
</style>
