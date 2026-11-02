<script lang="ts">
  // Une ligne par ville : nom, heure là-bas, « demain » / « hier », décalage, lune la nuit.
  // Mode édition : renommer, retirer, chercher une ville à ajouter (nom anglais du fuseau).
  import MoonIcon from 'phosphor-svelte/lib/MoonIcon'
  import XIcon from 'phosphor-svelte/lib/XIcon'
  import { pollWhileVisible } from '../../lib/poll.svelte'
  import type { WidgetProps } from '../types'
  import type { WorldClockSettings } from './manifest'
  import { diffLabel, isZone, searchZones, zoneLabel, zoneTime, type Zone } from './zones'

  let { settings, editing, save }: WidgetProps<WorldClockSettings> = $props()

  const MAX_ZONES = 8

  // Réglages abîmés à la main : on ne garde que les fuseaux connus.
  const zones = $derived(
    settings.zones
      .filter((z): z is Zone => typeof z?.tz === 'string' && isZone(z.tz))
      .slice(0, MAX_ZONES)
      .map((z) => ({ tz: z.tz, label: typeof z.label === 'string' ? z.label : zoneLabel(z.tz) }))
  )

  // Relu toutes les 10 s : la minute change à temps sans tourner pour rien.
  let now = $state(new Date())
  pollWhileVisible(() => (now = new Date()), 10_000)

  const shiftLabel = (shift: number): string =>
    shift > 0 ? 'demain' : shift < 0 ? 'hier' : "aujourd'hui"

  let query = $state('')
  // Liste des fuseaux lue une seule fois, à la première recherche.
  let all: string[] | undefined
  const results = $derived.by(() => {
    if (!query.trim()) return []
    all ??= Intl.supportedValuesOf('timeZone')
    return searchZones(all, query, 5).filter((tz) => !zones.some((z) => z.tz === tz))
  })

  function add(tz: string): void {
    if (zones.length >= MAX_ZONES) return
    save({ ...settings, zones: [...zones, { tz, label: zoneLabel(tz) }] })
    query = ''
  }

  function rename(tz: string, label: string): void {
    save({
      ...settings,
      zones: zones.map((z) => (z.tz === tz ? { ...z, label: label.trim() || zoneLabel(tz) } : z))
    })
  }

  const remove = (tz: string): void =>
    save({ ...settings, zones: zones.filter((z) => z.tz !== tz) })
</script>

<div class="widget" class:editing>
  <span class="label">Fuseaux horaires</span>
  <ul>
    {#each zones as zone (zone.tz)}
      {@const t = zoneTime(zone.tz, now)}
      <li class:night={t.night}>
        {#if editing}
          <input
            class="rename"
            value={zone.label}
            maxlength="30"
            aria-label="Nom affiché pour {zone.tz}"
            onchange={(event) => rename(zone.tz, event.currentTarget.value)}
            data-no-drag
          />
          <button
            type="button"
            class="remove"
            aria-label="Retirer {zone.label}"
            onclick={() => remove(zone.tz)}
          >
            <XIcon size={12} aria-hidden="true" />
          </button>
        {:else}
          <span class="city" title={zone.tz}>{zone.label}</span>
          <span class="time">
            {#if t.night}<MoonIcon size={14} aria-label="Nuit là-bas" />{/if}
            {t.time}
          </span>
          <span class="sub">{shiftLabel(t.dayShift)} · {diffLabel(t.diff)}</span>
        {/if}
      </li>
    {/each}
  </ul>
  {#if editing && zones.length < MAX_ZONES}
    <div class="add" data-no-drag>
      <input bind:value={query} placeholder="Ajouter une ville (en anglais)…" maxlength="40" />
      {#each results as tz (tz)}
        <button type="button" class="result" onclick={() => add(tz)}>
          {zoneLabel(tz)}
          <span>{tz}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .widget {
    box-sizing: border-box;
    height: 100%;
    padding: clamp(10px, 8cqmin, 20px);
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow: hidden;
  }

  /* Mode édition : la case grandit avec ses réglages, la carte les fait défiler (WidgetFrame). */
  .widget.editing {
    height: auto;
    min-height: 100%;
  }

  .label {
    font-size: var(--text-12);
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
    color: var(--text-faint);
  }

  ul {
    flex: 1;
    min-height: 0;
    margin: 0;
    padding: 0;
    list-style: none;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  li {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    column-gap: 8px;
  }

  .city {
    font-size: var(--text-14);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .time {
    grid-row: span 2;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: var(--text-display-s);
    font-weight: var(--weight-light);
    letter-spacing: var(--tracking-title);
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }

  .night .time {
    color: var(--text-muted);
  }

  .sub {
    font-size: var(--text-12);
    color: var(--text-faint);
    white-space: nowrap;
  }

  input {
    min-height: var(--control-h-input);
    padding: 0 10px;
    border: 1px solid var(--line);
    border-radius: var(--radius-input);
    background: var(--white-5);
    color: var(--text);
    font: inherit;
    font-size: var(--text-13);
    outline: 0;
  }

  input:focus {
    border-color: var(--border-focus);
  }

  .remove {
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: none;
    color: var(--text-faint);
    cursor: pointer;
  }

  .remove:hover {
    color: var(--text);
    background: var(--white-8);
  }

  .add {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .result {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    padding: 6px 10px;
    border: 0;
    border-radius: var(--radius-menu-item);
    background: none;
    color: var(--text);
    font: inherit;
    font-size: var(--text-13);
    text-align: left;
    cursor: pointer;
  }

  .result span {
    color: var(--text-faint);
    font-size: var(--text-12);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .result:hover {
    background: var(--surface-hover);
  }

  button:focus-visible {
    outline: var(--focus-ring);
    outline-offset: var(--focus-offset);
  }

  /* Petite case (1 rang) : la première ville seule, sur une ligne. */
  @container (max-height: 90px) {
    .label,
    .sub,
    li:not(:first-child) {
      display: none;
    }
  }
</style>
