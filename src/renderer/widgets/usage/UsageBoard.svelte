<script lang="ts">
  // Design « Tableau » (6×3) : session (barre + repère du temps écoulé), 7 jours glissants,
  // histogramme des 7 derniers jours (aujourd'hui en accent), projection au rythme actuel.
  import CheckCircleIcon from 'phosphor-svelte/lib/CheckCircleIcon'
  import TrendUpIcon from 'phosphor-svelte/lib/TrendUpIcon'
  import WarningCircleIcon from 'phosphor-svelte/lib/WarningCircleIcon'
  import type { ClaudeUsage } from '../../../shared/api'
  import { compact, hm, planName, versus } from './plan'

  let { usage, now, plan }: { usage: ClaudeUsage; now: number; plan: string } = $props()

  const v = $derived(versus(usage, plan, now))
  const narrow = new Intl.DateTimeFormat('fr-FR', { weekday: 'narrow' })
  const max = $derived(Math.max(1, ...usage.days))
  const bars = $derived(
    usage.days.map((tokens, i) => ({
      tokens,
      letter: narrow.format(new Date(now - (6 - i) * 86_400_000)).toUpperCase(),
      height: (tokens / max) * 78 // % de la hauteur du graphique (88 px sur 112)
    }))
  )
  const pct = (n: number): string => `${Math.round(n * 100)} %`
</script>

<div class="widget" class:over={v.over}>
  <div class="top">
    <div class="title">
      <span class="label">Usage Claude</span>
      <span class="chip">{planName(plan)}</span>
    </div>
    <span class="faint">{usage.messages} réponses · ≈ {compact(v.rate)}/h</span>
  </div>
  <div class="body">
    <div class="meters">
      <div class="meter">
        <div class="row">
          <div class="value"><span class="big">{pct(v.used)}</span><span>Session 5 h</span></div>
          {#if usage.resetsAt}<span class="faint">réinit. {hm(usage.resetsAt)}</span>{/if}
        </div>
        <div class="bar">
          <div class="fill" style:transform="scaleX({v.used})"></div>
          {#if usage.resetsAt}<div class="mark" style:left="{v.elapsed * 100}%"></div>{/if}
        </div>
        <span class="line">
          {compact(usage.session)} sur ≈ {compact(v.session)}
          {#if usage.resetsAt}· temps écoulé {pct(v.elapsed)}{/if}
        </span>
      </div>
      <div class="meter">
        <div class="row">
          <div class="value"><span class="big">{pct(v.usedWeek)}</span><span>Semaine</span></div>
          <span class="faint">7 jours glissants</span>
        </div>
        <div class="bar"><div class="fill week" style:transform="scaleX({v.usedWeek})"></div></div>
        <span class="line">{compact(usage.week)} sur ≈ {compact(v.week)}</span>
      </div>
    </div>
    <div class="days">
      <div class="row">
        <span class="muted">7 jours</span>
        <span class="total">{compact(usage.week)}</span>
      </div>
      <div class="chart">
        {#each bars as bar, i (i)}
          <div class="col" class:today={i === 6}>
            {#if i === 6}<span class="tip" style:bottom="calc({bar.height}% + 6px)"
                >{compact(bar.tokens)}</span
              >{/if}
            <div class="stick" style:height="{bar.height}%"></div>
          </div>
        {/each}
      </div>
      <div class="letters">
        {#each bars as bar, i (i)}<span class:today={i === 6}>{bar.letter}</span>{/each}
      </div>
    </div>
  </div>
  <div class="projection">
    {#if v.over}
      <WarningCircleIcon size={18} weight="duotone" color="var(--danger-text)" />
      <span>Limite atteinte{usage.resetsAt ? ` · reprise à ${hm(usage.resetsAt)}` : ''}</span>
    {:else if v.warn && usage.resetsAt}
      <TrendUpIcon size={18} weight="duotone" color="var(--accent-orange)" />
      <span>
        À ce rythme, limite atteinte vers {hm(v.hit)}, {Math.round(
          (usage.resetsAt - v.hit) / 60_000
        )}
        min avant la réinitialisation.
      </span>
    {:else if usage.resetsAt}
      <CheckCircleIcon size={18} weight="duotone" color="var(--accent)" />
      <span>À ce rythme, tu tiens jusqu'à la réinitialisation de {hm(usage.resetsAt)}.</span>
    {:else}
      <CheckCircleIcon size={18} weight="duotone" color="var(--accent)" />
      <span>Aucune session en cours : la suivante commence au prochain message.</span>
    {/if}
  </div>
</div>

<style>
  .widget {
    --tone: var(--accent);
    box-sizing: border-box;
    height: 100%;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .over {
    --tone: var(--danger);
  }

  .top,
  .row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
  }

  .top {
    align-items: center;
  }

  .title {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .label {
    font-size: var(--text-12);
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
    color: var(--text-faint);
  }

  .chip {
    height: 20px;
    padding: 0 8px;
    border-radius: var(--radius-pill);
    border: 1px solid var(--line);
    background: var(--white-5);
    font-size: var(--text-11);
    color: var(--text-muted);
    display: inline-flex;
    align-items: center;
  }

  .faint {
    font-size: var(--text-12);
    color: var(--text-faint);
    white-space: nowrap;
  }

  .body {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 196px;
    gap: 32px;
  }

  .meters {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 20px;
  }

  .meter {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .value {
    display: flex;
    align-items: baseline;
    gap: 8px;
    font-size: var(--text-13);
    color: var(--text-muted);
  }

  .big {
    font-size: var(--text-display-s);
    font-weight: var(--weight-light);
    letter-spacing: var(--tracking-display);
    line-height: 1;
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }

  .bar {
    position: relative;
    height: 6px;
    border-radius: 3px;
    background: var(--white-8);
  }

  .fill {
    position: absolute;
    inset: 0;
    border-radius: 3px;
    background: var(--tone);
    box-shadow: 0 0 10px var(--tone);
    transform-origin: left;
    transition: transform var(--dur-fill) var(--ease-out);
  }

  .fill.week {
    background: var(--white-55);
    box-shadow: none;
  }

  .mark {
    position: absolute;
    top: -4px;
    bottom: -4px;
    width: 2px;
    margin-left: -1px;
    border-radius: 1px;
    background: var(--text);
  }

  .line,
  .muted {
    font-size: var(--text-12);
    color: var(--text-muted);
  }

  .days {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    gap: 8px;
  }

  .total {
    font-size: var(--text-13);
    font-variant-numeric: tabular-nums;
  }

  /* 112 px dans la maquette ; se tasse si la carte est juste à sa taille minimale. */
  .chart {
    flex: 0 1 112px;
    min-height: 0;
    display: flex;
    align-items: flex-end;
    gap: 8px;
  }

  .col {
    position: relative;
    flex: 1;
    min-width: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
  }

  .tip {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    font-size: var(--text-11);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .stick {
    width: 100%;
    border-radius: 6px 6px 3px 3px;
    background: var(--white-12);
  }

  .today .stick {
    background: var(--accent);
    box-shadow: 0 0 16px -2px var(--accent);
  }

  .letters {
    display: flex;
    gap: 8px;
  }

  .letters span {
    flex: 1;
    min-width: 0;
    text-align: center;
    font-size: var(--text-11);
    color: var(--text-faint);
  }

  .letters .today {
    color: var(--accent);
  }

  .projection {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: var(--radius-row);
    background: var(--white-5);
    border: 1px solid var(--line);
    font-size: var(--text-13);
    color: var(--text-muted);
  }

  .projection :global(svg) {
    flex: none;
  }
</style>
