<script lang="ts">
  // Design « Historique » (6×3) : liste des habitudes à gauche, 20 semaines de la choisie à
  // droite (plus la série est longue, plus la case brille ; clic = cocher ce jour), série,
  // record et part des 30 derniers jours.
  import { dayKey } from '../../../shared/day'
  import { best, doneIn, streak, type Habit } from './habits'

  let {
    habits,
    now,
    ontoggle
  }: { habits: Habit[]; now: Date; ontoggle(habit: Habit, day: string): void } = $props()

  const WEEKS = 20
  let picked = $state<string | null>(null)
  const habit = $derived(habits.find((h) => h.id === picked) ?? habits[0])

  const month = new Intl.DateTimeFormat('fr-FR', { month: 'short' })
  const long = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  // Colonnes = semaines (lundi en haut), la dernière contient aujourd'hui.
  const grid = $derived.by(() => {
    if (!habit) return { cells: [], months: [] }
    const done = new Set(habit.days)
    const first = -((WEEKS - 1) * 7 + ((now.getDay() + 6) % 7))
    const date = (offset: number): Date =>
      new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset)
    // Série en cours au début de la grille, prolongée case par case.
    let run = 0
    for (let o = first - 30; o < first; o++) run = done.has(dayKey(now, o)) ? run + 1 : 0
    const cells = []
    const months = []
    let previous = -1
    for (let c = 0; c < WEEKS; c++) {
      const start = date(first + c * 7)
      months.push(start.getMonth() !== previous && c < WEEKS - 2 ? month.format(start) : '')
      previous = start.getMonth()
      for (let r = 0; r < 7; r++) {
        const offset = first + c * 7 + r
        const key = dayKey(now, offset)
        const on = done.has(key)
        if (offset <= 0) run = on ? run + 1 : 0
        cells.push({
          key,
          on,
          future: offset > 0,
          today: offset === 0,
          glow: Math.round(40 + Math.min(run, 10) * 6), // % d'accent
          bright: on && run >= 10,
          title: long.format(date(offset)) + (on ? ' · fait' : '')
        })
      }
    }
    return { cells, months }
  })
</script>

<div class="widget">
  <div class="list">
    <span class="label">Habitudes</span>
    {#each habits as h (h.id)}
      {@const series = streak(h.days, now)}
      <button
        type="button"
        class:on={h === habit}
        aria-pressed={h === habit}
        onclick={() => (picked = h.id)}
      >
        <span class="name">{h.name}</span>
        <span class="streak" class:lit={series > 0}>{series ? `${series} j` : '—'}</span>
      </button>
    {/each}
  </div>
  {#if habit}
    <div class="detail">
      <div class="head">
        <span class="title">{habit.name}</span>
        <span class="faint">{WEEKS} semaines</span>
      </div>
      <div class="map">
        <div class="weekdays" aria-hidden="true">
          <span></span><span>lun</span><span></span><span>mer</span><span></span><span>ven</span
          ><span></span><span></span>
        </div>
        <div>
          <div class="months" aria-hidden="true">
            {#each grid.months as m, i (i)}<span>{m}</span>{/each}
          </div>
          <div class="cells">
            {#each grid.cells as cell (cell.key)}
              <button
                type="button"
                class="cell"
                class:on={cell.on}
                class:future={cell.future}
                class:today={cell.today}
                class:bright={cell.bright}
                style:--glow="{cell.glow}%"
                title={cell.title}
                aria-label={cell.title}
                disabled={cell.future}
                onclick={() => ontoggle(habit, cell.key)}
              ></button>
            {/each}
          </div>
        </div>
      </div>
      <div class="stats">
        <div><span class="n lit">{streak(habit.days, now)} j</span><span>Série actuelle</span></div>
        <div><span class="n">{best(habit.days)} j</span><span>Record</span></div>
        <div>
          <span class="n">{Math.round((doneIn(habit.days, now, 30) / 30) * 100)} %</span>
          <span>Sur 30 jours</span>
        </div>
      </div>
    </div>
  {:else}
    <p class="empty">Ajoute tes habitudes en mode édition.</p>
  {/if}
</div>

<style>
  .widget {
    box-sizing: border-box;
    height: 100%;
    padding: 20px;
    display: grid;
    grid-template-columns: 168px minmax(0, 1fr);
    gap: 24px;
  }

  .label {
    margin-bottom: 7px;
    font-size: var(--text-12);
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
    color: var(--text-faint);
  }

  .list {
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .list button {
    flex: none;
    display: flex;
    align-items: center;
    gap: 8px;
    height: 34px;
    padding: 0 10px;
    box-sizing: border-box;
    border-radius: var(--radius-row);
    border: 1px solid transparent;
    background: transparent;
    color: var(--text-muted);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .list button:hover {
    background: var(--white-6);
  }

  .list button.on {
    border-color: var(--border-accent-soft);
    background: var(--surface-accent-soft);
    color: var(--text);
  }

  .name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--text-13);
  }

  .streak {
    font-size: var(--text-11);
    font-variant-numeric: tabular-nums;
    color: var(--text-faint);
  }

  .lit {
    color: var(--accent-orange);
  }

  .detail {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  .title {
    font-size: var(--text-15);
    font-weight: var(--weight-medium);
  }

  .faint {
    font-size: var(--text-12);
    color: var(--text-faint);
  }

  .map {
    display: flex;
    gap: 6px;
  }

  .weekdays {
    width: 20px;
    display: grid;
    grid-template-rows: 14px repeat(7, 12px);
    row-gap: 3px;
    font-size: 10px;
    line-height: 12px;
    color: var(--text-faint);
  }

  .months {
    display: grid;
    grid-template-columns: repeat(20, 12px);
    column-gap: 3px;
    height: 14px;
    margin-bottom: 3px;
    font-size: 10px;
    line-height: 14px;
    color: var(--text-faint);
    white-space: nowrap;
  }

  .cells {
    display: grid;
    grid-template-rows: repeat(7, 12px);
    grid-auto-flow: column;
    grid-auto-columns: 12px;
    gap: 3px;
  }

  .cell {
    box-sizing: border-box;
    width: 12px;
    height: 12px;
    padding: 0;
    border: 0;
    border-radius: 3px;
    background: var(--white-6);
    cursor: pointer;
  }

  .cell.on {
    background: color-mix(in srgb, var(--accent) var(--glow), transparent);
  }

  .cell.bright {
    box-shadow: 0 0 6px -1px var(--accent);
  }

  .cell.today {
    box-shadow: 0 0 0 1.5px var(--text);
  }

  .cell.future {
    background: transparent;
    cursor: default;
  }

  .cell:focus-visible {
    outline: var(--focus-ring);
  }

  .stats {
    margin-top: auto;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  .stats div {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: var(--text-11);
    color: var(--text-faint);
  }

  .n {
    font-size: 24px;
    font-weight: var(--weight-light);
    letter-spacing: var(--tracking-display);
    font-variant-numeric: tabular-nums;
    color: var(--text);
  }

  .n.lit {
    color: var(--accent-orange);
  }

  .empty {
    margin: auto 0;
    font-size: var(--text-13);
    color: var(--text-faint);
  }
</style>
