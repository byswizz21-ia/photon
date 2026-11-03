<script lang="ts">
  // Design « Journée » (6×2) : heure, secondes en accent, date ; à droite la journée en 24 barres
  // (heure en cours allumée), le temps qu'il reste, la semaine et le jour de l'année.
  import RollingNumber from '../../lib/RollingNumber.svelte'
  import { dayOfYear, isoWeek } from './time'

  let { now, date }: { now: Date; date: string } = $props()

  const two = (n: number): string => String(n).padStart(2, '0')
  const HOURS = Array.from({ length: 24 }, (_, i) => i)
  const hour = $derived(now.getHours())
  const minutes = $derived(hour * 60 + now.getMinutes())
  const rest = $derived(1440 - minutes)
</script>

<div class="widget">
  <div class="now">
    <div class="time" data-intro="spin">
      <RollingNumber value="{two(hour)}:{two(now.getMinutes())}" />
      <span class="sec"><RollingNumber value={two(now.getSeconds())} /></span>
    </div>
    <span class="date" data-intro="date">{date}</span>
  </div>
  <div class="day">
    <div class="head">
      <span class="label">Journée</span>
      <span class="pct">{Math.round((minutes / 1440) * 100)} %</span>
    </div>
    <div class="bars" aria-hidden="true">
      {#each HOURS as i (i)}
        <span class:past={i < hour} class:cur={i === hour}></span>
      {/each}
    </div>
    <div class="axis" aria-hidden="true">
      <span>00</span><span>06</span><span>12</span><span>18</span><span>24</span>
    </div>
    <div class="left">
      <span>Encore {Math.floor(rest / 60)} h {two(rest % 60)} aujourd'hui</span>
      <span class="week">Semaine {isoWeek(now)} · jour {dayOfYear(now)}</span>
    </div>
  </div>
</div>

<style>
  .widget {
    box-sizing: border-box;
    height: 100%;
    padding: 22px 26px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
  }

  .now {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
  }

  /* 88 px à la taille de la maquette, plus grand si la carte grandit (hauteur et largeur). */
  .time {
    display: flex;
    align-items: flex-start;
    gap: 0.09em;
    font-size: max(88px, min(48cqh, (100cqw - 272px) / 3.4));
    font-weight: var(--weight-light);
    letter-spacing: var(--tracking-display);
    line-height: 1;
    white-space: nowrap;
  }

  .sec {
    margin-top: 0.1em;
    font-size: 0.3em;
    color: var(--accent);
    text-shadow: 0 0 14px color-mix(in srgb, var(--accent) 60%, transparent);
  }

  .date {
    font-size: var(--text-15);
    color: var(--text-muted);
    white-space: nowrap;
  }

  .day {
    width: 196px;
    flex: none;
    display: flex;
    flex-direction: column;
    gap: 9px;
  }

  .head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  .label {
    font-size: var(--text-12);
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
    color: var(--text-faint);
  }

  .pct {
    font-size: var(--text-12);
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }

  .bars {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    height: 30px;
  }

  .bars span {
    width: 5px;
    height: 14px;
    border-radius: 3px;
    background: var(--white-8);
  }

  .bars .past {
    height: 22px;
    background: var(--white-30);
  }

  .bars .cur {
    height: 30px;
    background: var(--accent);
    box-shadow: var(--glow-bar);
  }

  .axis {
    display: flex;
    justify-content: space-between;
    font-size: var(--text-11);
    color: var(--text-faint);
    font-variant-numeric: tabular-nums;
  }

  .left {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-top: 4px;
    font-size: var(--text-13);
  }

  .week {
    font-size: var(--text-12);
    color: var(--text-faint);
  }
</style>
