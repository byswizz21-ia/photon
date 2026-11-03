<script lang="ts">
  // Dépensé ce mois en grand, jauge du plafond, reste par jour, répartition par catégorie,
  // saisie rapide (montant, catégorie, libellé, Entrée) et dernières dépenses.
  // Mode édition : plafond mensuel, données propres au profil, suppression d'une dépense.
  import XIcon from 'phosphor-svelte/lib/XIcon'
  import { dayKey } from '../../../shared/day'
  import { euros, parseAmount } from '../../../shared/micro'
  import OwnToggle from '../../lib/OwnToggle.svelte'
  import { pollWhileVisible } from '../../lib/poll.svelte'
  import { profileKey, shared } from '../../lib/shared.svelte'
  import type { WidgetProps } from '../types'
  import { byCategory, CATEGORIES, inMonth, parseBudget, perDay, sum, type Category } from './budget'
  import type { BudgetSettings } from './manifest'

  let { settings, editing, save }: WidgetProps<BudgetSettings> = $props()

  const data = $derived(shared(profileKey('budget', settings.own === true), parseBudget))

  let now = $state(new Date())
  pollWhileVisible(() => (now = new Date()), 60_000)

  const today = $derived(dayKey(now))
  const month = $derived(today.slice(0, 7))
  const monthName = $derived(new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(now))
  const expenses = $derived(inMonth(data.value.expenses, month))
  const spent = $derived(sum(expenses))
  const limit = $derived(data.value.limit)
  const left = $derived(limit - spent)
  const ratio = $derived(limit ? Math.min(1, spent / limit) : 0)
  const categories = $derived(byCategory(expenses).slice(0, 4))
  const recent = $derived(expenses.toReversed())

  let amount = $state('')
  let category = $state<Category>('food')
  let label = $state('')
  const cents = $derived(parseAmount(amount))

  function add(): void {
    if (cents === null) return
    data.value.expenses.push({
      id: crypto.randomUUID(),
      date: today,
      amount: cents,
      category,
      label: label.trim().slice(0, 60)
    })
    amount = ''
    label = ''
    data.save()
  }

  function remove(id: string): void {
    data.value.expenses = data.value.expenses.filter((e) => e.id !== id)
    data.save()
  }

  function setLimit(text: string): void {
    data.value.limit = parseAmount(text) ?? 0
    data.save()
  }

  const onEnter = (event: KeyboardEvent): void => {
    if (event.key === 'Enter') add()
  }
  const short = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })
</script>

<div class="w-body">
  <div class="w-head">
    <span class="w-label">Budget · {monthName}</span>
    {#if limit && !editing}
      <span class="w-hint">{euros(limit)} prévus</span>
    {/if}
  </div>

  {#if editing}
    <div class="w-row settings" data-no-drag>
      <label class="w-field">
        Plafond du mois (€)
        <input
          class="w-input"
          inputmode="decimal"
          value={limit ? String(limit / 100) : ''}
          placeholder="Aucun"
          onchange={(e) => setLimit(e.currentTarget.value)}
        />
      </label>
      <OwnToggle checked={settings.own === true} onchange={(own) => save({ ...settings, own })} />
    </div>
  {/if}

  <div class="top">
    <p class="spent">{euros(spent)}<span> dépensés</span></p>
    {#if limit}
      <p class="left" class:over={left < 0}>
        {left < 0 ? `${euros(-left)} de trop` : `reste ${euros(left)}`}
      </p>
    {/if}
  </div>
  {#if limit}
    <div class="gauge" role="meter" aria-valuenow={spent} aria-valuemax={limit} aria-label="Budget utilisé">
      <div class="fill" class:over={left < 0} style:transform="scaleX({ratio})"></div>
    </div>
    <p class="w-hint">
      {#if left > 0}≈ {euros(perDay(left, now))} par jour jusqu'à la fin du mois{:else}Plafond atteint{/if}
    </p>
  {/if}

  {#if categories.length}
    <ul class="cats">
      {#each categories as c (c.category)}
        <li>
          <span>{CATEGORIES[c.category]}</span>
          <span class="bar" style:transform="scaleX({c.amount / (categories[0]?.amount ?? 1)})"></span>
          <span class="amount">{euros(c.amount)}</span>
        </li>
      {/each}
    </ul>
  {/if}

  <div class="w-row" data-no-drag>
    <input
      class="w-input amount-in"
      bind:value={amount}
      onkeydown={onEnter}
      disabled={!data.ready}
      inputmode="decimal"
      placeholder="€"
      aria-label="Montant dépensé"
    />
    <select class="w-input" bind:value={category} aria-label="Catégorie" disabled={!data.ready}>
      {#each Object.entries(CATEGORIES) as [id, name] (id)}<option value={id}>{name}</option>{/each}
    </select>
    <input
      class="w-input grow"
      bind:value={label}
      onkeydown={onEnter}
      disabled={!data.ready}
      maxlength="60"
      placeholder="Libellé (Entrée)"
      aria-label="Libellé"
    />
  </div>

  {#if recent.length}
    <ul class="w-list recent">
      {#each recent as e (e.id)}
        <li>
          {#if editing}
            <button
              type="button"
              class="w-icon"
              aria-label="Supprimer cette dépense"
              onclick={() => remove(e.id)}><XIcon size={12} aria-hidden="true" /></button
            >
          {/if}
          <span class="date">{short.format(new Date(`${e.date}T00:00`)).replace('.', '')}</span>
          <span class="what">{e.label || CATEGORIES[e.category]}</span>
          <span class="amount">{euros(e.amount, true)}</span>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .settings {
    align-items: flex-end;
    justify-content: space-between;
    flex-wrap: wrap;
  }

  .top {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }

  p {
    margin: 0;
  }

  .spent {
    font-size: clamp(22px, 12cqmin, 34px);
    font-weight: var(--weight-light);
    line-height: 1.1;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .spent span {
    font-size: var(--text-13);
    color: var(--text-muted);
  }

  .left {
    font-size: var(--text-13);
    color: var(--text-muted);
    white-space: nowrap;
  }

  .left.over {
    color: var(--danger-text);
  }

  .gauge {
    height: 6px;
    flex: none;
    border-radius: var(--radius-pill);
    background: var(--white-8);
    overflow: hidden;
  }

  .fill {
    height: 100%;
    background: var(--accent);
    transform-origin: left;
    transition: transform var(--dur-fill) var(--ease-out);
  }

  .fill.over {
    background: var(--danger);
  }

  .cats {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 3px;
  }

  .cats li {
    display: grid;
    grid-template-columns: 76px 1fr auto;
    align-items: center;
    gap: 8px;
    font-size: var(--text-12);
    color: var(--text-muted);
  }

  .bar {
    height: 4px;
    border-radius: var(--radius-pill);
    background: var(--surface-accent-soft);
    transform-origin: left;
  }

  .amount {
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .amount-in {
    width: 64px;
  }

  .grow {
    flex: 1;
  }

  .recent li {
    min-height: 24px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: var(--text-13);
  }

  .date {
    width: 48px;
    font-size: var(--text-12);
    color: var(--text-faint);
  }

  .what {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text-muted);
  }

  /* Carte basse : l'essentiel (total, jauge, saisie). */
  @container (max-height: 260px) {
    .cats {
      display: none;
    }
  }

  @container (max-height: 200px) {
    .recent,
    .w-hint {
      display: none;
    }
  }
</style>
