<script lang="ts">
  // Ligne (pastille à sa couleur) et arrêt, puis pour chaque direction les prochains passages :
  // « 2 min », « 14 min », au-delà d'une heure l'heure exacte. Point animé : temps réel.
  // Minutes recalculées toutes les 15 s depuis les heures en cache : justes même entre deux
  // lectures. Réglage (ligne puis arrêt) en mode édition, ou tout de suite si rien n'est choisi.
  import type { Feed, TransitDeparture, TransitLine, TransitStop } from '../../../shared/api'
  import { pollWhileVisible } from '../../lib/poll.svelte'
  import { timeLabel } from '../../lib/when'
  import type { WidgetProps } from '../types'
  import type { TransitSettings } from './manifest'

  let { settings, editing, save, preview }: WidgetProps<TransitSettings> = $props()

  let feed = $state.raw<Feed<TransitDeparture> | null | undefined>()
  let now = $state(Date.now())
  pollWhileVisible(async () => {
    feed = await window.photon.transit(settings)
    now = Date.now()
  }, 15_000)

  const choosing = $derived(editing || !settings.stop)

  // Listes de lignes et d'arrêts : lues seulement pendant le réglage (geste de l'utilisateur).
  let lines = $state.raw<TransitLine[] | null | undefined>()
  let stops = $state.raw<TransitStop[] | null | undefined>()
  $effect(() => {
    if (!choosing || preview || lines) return
    void window.photon.transitLines().then((list) => (lines = list))
  })
  $effect(() => {
    const line = settings.line
    if (!choosing || preview || !line) return
    stops = undefined
    void window.photon.transitStops(line).then((list) => {
      if (settings.line === line) stops = list
    })
  })

  function pickLine(id: string): void {
    const line = lines?.find((l) => l.id === id)
    save({
      ...settings,
      line: id,
      lineCode: line?.code ?? '',
      lineColor: line?.color ?? '',
      stop: '',
      stopName: ''
    })
  }

  function pickStop(id: string): void {
    save({ ...settings, stop: id, stopName: stops?.find((s) => s.id === id)?.name ?? '' })
  }

  function wait(at: number): string {
    const minutes = Math.floor((at - now) / 60_000)
    if (minutes <= 0) return 'Proche'
    return minutes < 60 ? `${minutes} min` : timeLabel(at)
  }

  const departures = $derived(
    (feed?.items ?? []).map((d) => ({ ...d, times: d.times.filter((t) => t.at > now - 30_000) }))
  )
</script>

<div class="w-body">
  <div class="w-head">
    <span class="line">
      {#if settings.lineCode}
        <span
          class="badge"
          style:background={settings.lineColor ? `#${settings.lineColor}` : undefined}
          >{settings.lineCode}</span
        >
      {/if}
      <span class="stop">{settings.stopName || 'Bus et tram'}</span>
    </span>
    {#if feed?.error}<span class="w-hint">{feed.error}</span>{/if}
  </div>

  {#if choosing}
    <div class="pick" data-no-drag>
      {#if lines === undefined}
        <p class="w-hint">Lecture des lignes Divia…</p>
      {:else if lines === null}
        <p class="w-hint">Réseau Divia injoignable.</p>
      {:else}
        <select
          class="w-input"
          value={settings.line}
          aria-label="Ligne"
          onchange={(e) => pickLine(e.currentTarget.value)}
        >
          <option value="" disabled>Ligne…</option>
          {#each lines as line (line.id)}
            <option value={line.id}>{line.code} · {line.name}</option>
          {/each}
        </select>
        {#if settings.line}
          {#if stops === undefined}
            <p class="w-hint">Lecture des arrêts…</p>
          {:else if stops === null}
            <p class="w-hint">Arrêts illisibles.</p>
          {:else}
            <select
              class="w-input"
              value={settings.stop}
              aria-label="Arrêt"
              onchange={(e) => pickStop(e.currentTarget.value)}
            >
              <option value="" disabled>Arrêt…</option>
              {#each stops as stop (stop.id)}<option value={stop.id}>{stop.name}</option>{/each}
            </select>
          {/if}
        {/if}
      {/if}
    </div>
  {/if}

  {#if settings.stop && !editing}
    {#if !feed || (feed.updatedAt === null && !feed.error)}
      <p class="w-message">Lecture des passages…</p>
    {:else if !departures.some((d) => d.times.length)}
      <p class="w-message">{feed.error ? 'Hors ligne' : 'Plus de passage pour le moment.'}</p>
    {:else}
      <ul class="w-list">
        {#each departures as d (d.direction)}
          <li class="direction">
            <span class="to" title={d.direction}>→ {d.direction}</span>
            <span class="times">
              {#each d.times.slice(0, 3) as t, i (t.at)}
                <span class="time" class:first={i === 0}>
                  {#if t.realtime && i === 0}<span class="live" title="Temps réel"></span>{/if}
                  {wait(t.at)}
                </span>
              {/each}
            </span>
          </li>
        {/each}
      </ul>
    {/if}
  {/if}
</div>

<style>
  .line {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .badge {
    flex: none;
    min-width: 28px;
    padding: 2px 6px;
    border-radius: var(--radius-icon);
    background: var(--accent);
    color: var(--white);
    font-size: var(--text-12);
    font-weight: var(--weight-semibold);
    text-align: center;
  }

  .stop {
    font-size: var(--text-14);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .pick {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .direction {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 4px 0;
  }

  .to {
    font-size: var(--text-12);
    color: var(--text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .times {
    display: flex;
    align-items: baseline;
    gap: 12px;
    font-variant-numeric: tabular-nums;
  }

  .time {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: var(--text-13);
    color: var(--text-faint);
    white-space: nowrap;
  }

  .time.first {
    font-size: clamp(16px, 9cqmin, 22px);
    color: var(--text);
  }

  .live {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent-mint);
    animation: pulse var(--dur-pulse) var(--ease-out) infinite alternate;
  }

  @keyframes pulse {
    to {
      opacity: 0.3;
    }
  }
</style>
