<script lang="ts">
  // Heure 24 h dont les chiffres défilent, date en français dessous. Relue 4 fois par seconde,
  // seulement quand Photon est affiché. En édition : design, case « Afficher les secondes ».
  import DesignPicker from '../../lib/DesignPicker.svelte'
  import { pollWhileVisible } from '../../lib/poll.svelte'
  import RollingNumber from '../../lib/RollingNumber.svelte'
  import type { WidgetProps } from '../types'
  import ClockDay from './ClockDay.svelte'
  import ClockDial from './ClockDial.svelte'
  import ClockLegs from './ClockLegs.svelte'
  import { CLOCK_DESIGNS, type ClockSettings } from './manifest'

  let { settings, editing, save }: WidgetProps<ClockSettings> = $props()

  const dateFormat = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })
  const two = (n: number): string => String(n).padStart(2, '0')

  // Lecture 4 fois par seconde : la minute (ou la seconde) change à l'écran sans retard visible.
  let now = $state(new Date())
  pollWhileVisible(() => {
    now = new Date()
  }, 250)

  const time = $derived(
    `${two(now.getHours())}:${two(now.getMinutes())}` +
      (settings.seconds ? `:${two(now.getSeconds())}` : '')
  )
  const date = $derived(dateFormat.format(now).replace(/^./, (letter) => letter.toUpperCase()))
</script>

{#if editing}
  <div class="options">
    <DesignPicker
      designs={CLOCK_DESIGNS}
      value={settings.design}
      onpick={(design) => save({ ...settings, design })}
    />
    {#if settings.design !== 'day' && settings.design !== 'dial' && settings.design !== 'legs'}
      <label class="field" data-no-drag>
        <input
          type="checkbox"
          checked={settings.seconds}
          onchange={(event) => save({ ...settings, seconds: event.currentTarget.checked })}
        />
        <span>Afficher les secondes</span>
      </label>
    {/if}
  </div>
{:else if settings.design === 'day'}
  <ClockDay {now} {date} />
{:else if settings.design === 'dial'}
  <ClockDial {now} {date} />
{:else if settings.design === 'legs'}
  <ClockLegs
    time="{two(now.getHours())}:{two(now.getMinutes())}"
    {date}
    seconds={now.getSeconds()}
  />
{:else}
  <div class="widget">
    <p class="time" class:seconds={settings.seconds} data-intro="spin">
      <RollingNumber value={time} />
    </p>
    <p class="date" data-intro="date">{date}</p>
  </div>
{/if}

<style>
  .widget {
    /* Place retirée à la hauteur de l'heure : date + écart. */
    --pad: clamp(14px, 6cqmin, 28px);
    --date-rows: 32px;
    box-sizing: border-box;
    height: 100%;
    padding: var(--pad);
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 12px;
  }

  .options {
    box-sizing: border-box;
    padding: clamp(10px, 6cqmin, 20px);
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  /* L'heure prend la plus petite des trois tailles : maquette, hauteur restante, largeur. */
  .time {
    --span: 2.75; /* largeur de « 14:32 » en em (mesurée 2,71) */
    margin: 0;
    font-size: min(
      96px,
      100cqh - 2 * var(--pad) - var(--date-rows),
      (100cqw - 2 * var(--pad)) / var(--span)
    );
    font-weight: var(--weight-light);
    letter-spacing: var(--tracking-display);
    line-height: 1;
    white-space: nowrap;
  }

  .time.seconds {
    --span: 4.25; /* largeur de « 14:32:07 » en em (mesurée 4,18) */
  }

  .date {
    margin: 0;
    font-size: clamp(12px, 7cqw, 16px);
    line-height: 20px;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Carte trop basse : la date s'efface, toute la place va à l'heure. */
  @container (max-height: 110px) {
    .widget {
      --date-rows: 0px;
    }

    .date {
      display: none;
    }
  }

  .field {
    align-self: flex-start;
    max-width: 100%;
    min-height: 24px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: var(--text-13);
    color: var(--text-muted);
    cursor: pointer;
  }

  .field input {
    flex: none;
    width: 16px;
    height: 16px;
    margin: 0;
    accent-color: var(--accent);
    cursor: pointer;
  }

  .field span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
