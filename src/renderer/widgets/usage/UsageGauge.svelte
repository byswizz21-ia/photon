<script lang="ts">
  // Design « Jauge » (4×2) : anneau des tokens de la session (rouge à la limite), anneau fin du
  // temps écoulé de la fenêtre de 5 h, ce qu'il reste à peu près, la réinitialisation.
  import type { ClaudeUsage } from '../../../shared/api'
  import { compact, hm, left, planName, versus } from './plan'

  let { usage, now, plan }: { usage: ClaudeUsage; now: number; plan: string } = $props()

  const v = $derived(versus(usage, plan, now))
  const C1 = 2 * Math.PI * 54
  const C2 = 2 * Math.PI * 41
</script>

<div class="widget" class:over={v.over}>
  <div class="ring">
    <svg viewBox="0 0 124 124" aria-hidden="true">
      <circle class="track" cx="62" cy="62" r="54" />
      <circle
        class="value"
        cx="62"
        cy="62"
        r="54"
        stroke-dasharray={C1}
        stroke-dashoffset={C1 * (1 - v.used)}
      />
      <circle class="track thin" cx="62" cy="62" r="41" />
      <circle
        class="time"
        cx="62"
        cy="62"
        r="41"
        stroke-dasharray={C2}
        stroke-dashoffset={C2 * (1 - v.elapsed)}
      />
    </svg>
    <div class="pct">
      <span class="big">{Math.round(v.used * 100)} %</span>
      <span class="small">de la session</span>
    </div>
  </div>
  <div class="side">
    <div class="head">
      <span class="label">Claude</span>
      <span class="chip">{planName(plan)}</span>
    </div>
    <div class="remain">
      <span class="big">{v.over ? 'Limite' : `≈ ${compact(v.session - usage.session)}`}</span>
      <span class="unit">{v.over ? 'atteinte' : 'restants'}</span>
    </div>
    <span class="sub">
      {#if usage.resetsAt}
        Réinitialisation dans {left(usage.resetsAt, now, true)} · {hm(usage.resetsAt)}
      {:else}
        Aucune session en cours
      {/if}
    </span>
    <div class="legend">
      <span><i class="dot"></i>Tokens</span>
      <span><i class="dash"></i>Temps écoulé {Math.round(v.elapsed * 100)} %</span>
    </div>
  </div>
</div>

<style>
  .widget {
    --tone: var(--accent);
    box-sizing: border-box;
    height: 100%;
    padding: 20px;
    display: flex;
    align-items: center;
    gap: 22px;
  }

  .over {
    --tone: var(--danger);
  }

  /* 124 px à la taille de la maquette, plus grand si la carte grandit. */
  .ring {
    position: relative;
    flex: none;
    width: max(124px, min(100cqh - 54px, 40cqw));
    aspect-ratio: 1;
  }

  svg {
    position: absolute;
    inset: 0;
    transform: rotate(-90deg);
    overflow: visible;
  }

  circle {
    fill: none;
  }

  .track {
    stroke: var(--white-8);
    stroke-width: 9;
  }

  .track.thin {
    stroke: var(--white-6);
    stroke-width: 3;
  }

  .value {
    stroke: var(--tone);
    stroke-width: 9;
    stroke-linecap: round;
    filter: drop-shadow(0 0 6px var(--tone));
    transition: stroke-dashoffset var(--dur-fill) var(--ease-out);
  }

  .time {
    stroke: var(--white-55);
    stroke-width: 3;
    stroke-linecap: round;
  }

  .pct {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
  }

  .big {
    font-size: 28px;
    font-weight: var(--weight-light);
    letter-spacing: var(--tracking-display);
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }

  .small {
    font-size: var(--text-11);
    color: var(--text-faint);
  }

  .side {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
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
    white-space: nowrap;
  }

  .remain {
    display: flex;
    align-items: baseline;
    gap: 6px;
    margin-top: 2px;
  }

  .over .remain .big {
    color: var(--danger-text);
  }

  .unit,
  .sub {
    font-size: var(--text-12);
    color: var(--text-muted);
  }

  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 14px;
    margin-top: 8px;
    font-size: var(--text-11);
    color: var(--text-faint);
  }

  .legend span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: var(--glow-dot);
  }

  .dash {
    width: 8px;
    height: 3px;
    border-radius: 2px;
    background: var(--white-55);
  }
</style>
