<script lang="ts">
  // CA de l'année en grand, jauge du plafond (trait = seuil de TVA), prochaine déclaration et
  // cotisations estimées, saisie d'un encaissement, derniers encaissements.
  // Mode édition : activité, rythme de déclaration, taux de cotisations.
  import XIcon from 'phosphor-svelte/lib/XIcon'
  import { dayKey } from '../../lib/day'
  import { pollWhileVisible } from '../../lib/poll.svelte'
  import { shared } from '../../lib/shared.svelte'
  import type { WidgetProps } from '../types'
  import type { MicroSettings } from './manifest'
  import {
    ACTIVITIES,
    euros,
    nextDeclaration,
    parseAmount,
    parseMicro,
    total,
    type Activity,
    type Period
  } from './micro'

  let { settings, editing, save }: WidgetProps<MicroSettings> = $props()

  const data = shared('micro', parseMicro)

  // Relu chaque minute : la déclaration change de période à minuit sans rouvrir Photon.
  let now = $state(new Date())
  pollWhileVisible(() => (now = new Date()), 60_000)

  const activity = $derived(ACTIVITIES[settings.activity] ?? ACTIVITIES.services)
  const period: Period = $derived(settings.period === 'trimestre' ? 'trimestre' : 'mois')
  const rate = $derived(settings.rate > 0 && settings.rate < 100 ? settings.rate : activity.rate)

  const today = $derived(dayKey(now))
  const year = $derived(now.getFullYear())
  const revenue = $derived(total(data.value.payments, `${year}-01-01`, `${year}-12-31`))
  const ratio = $derived(Math.min(1, revenue / (activity.ceiling * 100)))
  const vatMark = $derived(activity.vat / activity.ceiling)
  const overVat = $derived(revenue > activity.vat * 100)
  const declaration = $derived(nextDeclaration(today, period))
  const toDeclare = $derived(total(data.value.payments, declaration.from, declaration.to))
  const deadline = $derived(
    new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(
      new Date(`${declaration.deadline}T00:00`)
    )
  )
  const recent = $derived(data.value.payments.toSorted((a, b) => b.date.localeCompare(a.date)))

  let amount = $state('')
  let label = $state('')
  let date = $state('')
  const parsed = $derived(parseAmount(amount))

  function add(): void {
    if (parsed === null) return
    data.value.payments.push({
      id: crypto.randomUUID(),
      date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : today,
      amount: parsed,
      label: label.trim().slice(0, 60)
    })
    amount = ''
    label = ''
    date = ''
    data.save()
  }

  function remove(id: string): void {
    data.value.payments = data.value.payments.filter((p) => p.id !== id)
    data.save()
  }

  const short = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })
  const onEnter = (event: KeyboardEvent): void => {
    if (event.key === 'Enter') add()
  }
</script>

<div class="widget">
  <div class="head">
    <span class="label">Micro-entreprise</span>
    <span class="year">CA {year}</span>
  </div>

  {#if editing}
    <div class="settings" data-no-drag>
      <label class="field">
        Activité
        <select
          value={settings.activity}
          onchange={(event) =>
            save({ ...settings, activity: event.currentTarget.value as Activity })}
        >
          {#each Object.entries(ACTIVITIES) as [id, a] (id)}<option value={id}>{a.label}</option
            >{/each}
        </select>
      </label>
      <label class="field">
        Déclaration
        <select
          value={period}
          onchange={(event) => save({ ...settings, period: event.currentTarget.value as Period })}
        >
          <option value="mois">Mensuelle</option>
          <option value="trimestre">Trimestrielle</option>
        </select>
      </label>
      <label class="field">
        Cotisations (%)
        <input
          type="number"
          min="0"
          max="99"
          step="0.1"
          value={settings.rate || ''}
          placeholder="{activity.rate} (barème 2026)"
          onchange={(event) => save({ ...settings, rate: Number(event.currentTarget.value) || 0 })}
        />
      </label>
    </div>
  {:else}
    <p class="revenue">{euros(revenue)}</p>
    <div class="gauge" title="Plafond {euros(activity.ceiling * 100)}">
      <div class="fill" class:warn={overVat} style:transform="scaleX({ratio})"></div>
      <div class="mark" style:left="{vatMark * 100}%" title="Seuil de TVA"></div>
    </div>
    <p class="hint">
      {Math.round(ratio * 100)} % du plafond ({euros(activity.ceiling * 100)}) ·
      {#if overVat}
        <span class="danger">seuil de TVA dépassé : TVA à facturer</span>
      {:else}
        TVA dans {euros(activity.vat * 100 - revenue)}
      {/if}
    </p>

    <div class="declare">
      <span>Déclarer {declaration.name} avant le {deadline}</span>
      <strong>
        {euros(toDeclare)}
        <span class="due">≈ {euros(Math.round((toDeclare * rate) / 100))} de cotisations</span>
      </strong>
    </div>

    <div class="add" data-no-drag>
      <input
        class="amount"
        bind:value={amount}
        onkeydown={onEnter}
        inputmode="decimal"
        placeholder="Encaissé (€)"
        aria-label="Montant encaissé"
        disabled={!data.ready}
      />
      <input
        class="what"
        bind:value={label}
        onkeydown={onEnter}
        maxlength="60"
        placeholder="Client…"
        aria-label="Client ou objet"
      />
      <input
        class="date"
        type="date"
        bind:value={date}
        max={today}
        aria-label="Date d'encaissement"
      />
      <button type="button" class="ok" disabled={parsed === null} onclick={add}>Ajouter</button>
    </div>

    <ul>
      {#each recent as p (p.id)}
        <li>
          <span class="when">{short.format(new Date(`${p.date}T00:00`))}</span>
          <span class="who">{p.label || '—'}</span>
          <span class="sum">{euros(p.amount, true)}</span>
          <button
            type="button"
            class="remove"
            aria-label="Supprimer cet encaissement"
            onclick={() => remove(p.id)}
          >
            <XIcon size={12} aria-hidden="true" />
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .widget {
    box-sizing: border-box;
    height: 100%;
    padding: clamp(12px, 8cqmin, 20px);
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow: hidden;
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

  .year {
    font-size: var(--text-12);
    color: var(--text-faint);
  }

  p {
    margin: 0;
  }

  .revenue {
    font-size: var(--text-display-s);
    font-weight: var(--weight-light);
    letter-spacing: var(--tracking-title);
    font-variant-numeric: tabular-nums;
    line-height: 1.1;
  }

  .gauge {
    position: relative;
    height: 6px;
    flex: none;
    border-radius: var(--radius-bar);
    background: var(--white-8);
    overflow: hidden;
  }

  .fill {
    position: absolute;
    inset: 0;
    background: var(--accent);
    transform-origin: left;
    transition: transform var(--dur-fill) var(--ease-out);
  }

  .fill.warn {
    background: var(--accent-orange);
  }

  .mark {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    background: var(--text);
    opacity: 0.6;
  }

  .hint {
    font-size: var(--text-12);
    color: var(--text-faint);
  }

  .danger {
    color: var(--danger-text);
  }

  .declare {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 10px;
    border-radius: var(--radius-row);
    background: var(--white-5);
    font-size: var(--text-12);
    color: var(--text-muted);
  }

  .declare strong {
    font-size: var(--text-14);
    font-weight: var(--weight-medium);
    color: var(--text);
  }

  .due {
    font-size: var(--text-12);
    font-weight: var(--weight-regular);
    color: var(--accent);
  }

  .add {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }

  .settings {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: var(--text-12);
    color: var(--text-muted);
  }

  input,
  select {
    box-sizing: border-box;
    min-width: 0;
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

  select option {
    background: var(--surface-option);
  }

  input:focus,
  select:focus {
    border-color: var(--border-focus);
  }

  input[type='date'] {
    color-scheme: dark;
  }

  .ok {
    min-height: var(--control-h-input);
    border: 0;
    border-radius: var(--radius-pill);
    background: var(--accent);
    color: var(--on-accent);
    font: inherit;
    font-size: var(--text-13);
    font-weight: var(--weight-medium);
    cursor: pointer;
    transition: transform var(--dur-press) var(--ease-out);
  }

  .ok:active {
    transform: scale(var(--press-scale));
  }

  .ok:disabled {
    opacity: 0.4;
    cursor: default;
  }

  ul {
    flex: 1;
    min-height: 0;
    margin: 0;
    padding: 0;
    list-style: none;
    overflow-y: auto;
  }

  li {
    display: grid;
    grid-template-columns: 52px minmax(0, 1fr) auto 22px;
    align-items: center;
    gap: 6px;
    min-height: 26px;
    font-size: var(--text-13);
  }

  .when {
    color: var(--text-faint);
    font-size: var(--text-12);
  }

  .who {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text-muted);
  }

  .sum {
    font-variant-numeric: tabular-nums;
  }

  .remove {
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: none;
    color: var(--text-faint);
    cursor: pointer;
    opacity: 0;
  }

  li:hover .remove,
  .remove:focus-visible {
    opacity: 1;
  }

  .remove:hover {
    color: var(--text);
    background: var(--white-8);
  }

  button:focus-visible {
    outline: var(--focus-ring);
    outline-offset: var(--focus-offset);
  }

  /* Petite case : le CA, la jauge et la déclaration seulement. */
  @container (max-height: 300px) {
    .add,
    ul {
      display: none;
    }
  }

  @container (max-height: 170px) {
    .declare,
    .hint {
      display: none;
    }
  }
</style>
