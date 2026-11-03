<script lang="ts">
  // Total par mois et par an, puis chaque abonnement par date de prélèvement. « Ajouter » ouvre
  // le formulaire (nom, montant, rythme, date d'un prélèvement) ; suppression en mode édition.
  import PlusIcon from 'phosphor-svelte/lib/PlusIcon'
  import XIcon from 'phosphor-svelte/lib/XIcon'
  import { dayKey } from '../../../shared/day'
  import { daysUntil } from '../../../shared/days'
  import { euros, parseAmount } from '../../../shared/micro'
  import {
    EVERY,
    monthly,
    nextCharge,
    parseSubscriptions,
    type Every
  } from '../../../shared/subscriptions'
  import { pollWhileVisible } from '../../lib/poll.svelte'
  import { shared } from '../../lib/shared.svelte'
  import type { WidgetProps } from '../types'
  import type { SubscriptionsSettings } from './manifest'

  let { editing }: WidgetProps<SubscriptionsSettings> = $props()

  const data = shared('subscriptions', parseSubscriptions)

  let now = $state(new Date())
  pollWhileVisible(() => (now = new Date()), 60_000)

  const today = $derived(dayKey(now))
  const list = $derived(
    data.value.subs
      .map((sub) => {
        const next = nextCharge(sub, today)
        return { ...sub, next, days: daysUntil(next, now) ?? 0 }
      })
      .sort((a, b) => a.next.localeCompare(b.next))
  )
  const perMonth = $derived(data.value.subs.reduce((sum, sub) => sum + monthly(sub), 0))
  const thisMonth = $derived(
    list.filter((s) => s.next.slice(0, 7) === today.slice(0, 7)).reduce((t, s) => t + s.amount, 0)
  )

  const short = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })
  const when = (days: number): string =>
    days === 0 ? "aujourd'hui" : days === 1 ? 'demain' : `dans ${days} j`

  let adding = $state(false)
  let name = $state('')
  let amount = $state('')
  let every = $state<Every>('month')
  let start = $state('')
  const cents = $derived(parseAmount(amount))
  const valid = $derived(name.trim() !== '' && cents !== null && /^\d{4}-\d{2}-\d{2}$/.test(start))

  function open(): void {
    adding = true
    start = today
  }

  function add(): void {
    if (!valid || cents === null) return
    data.value.subs.push({
      id: crypto.randomUUID(),
      name: name.trim().slice(0, 60),
      amount: cents,
      every,
      start
    })
    name = ''
    amount = ''
    adding = false
    data.save()
  }

  function remove(id: string): void {
    data.value.subs = data.value.subs.filter((s) => s.id !== id)
    data.save()
  }

  const onEnter = (event: KeyboardEvent): void => {
    if (event.key === 'Enter') add()
    if (event.key === 'Escape') adding = false
  }
</script>

<div class="w-body">
  <div class="w-head">
    <span class="w-label">Abonnements</span>
    {#if !adding && data.ready}
      <button type="button" class="w-icon" aria-label="Ajouter un abonnement" onclick={open}>
        <PlusIcon size={14} aria-hidden="true" />
      </button>
    {/if}
  </div>

  {#if adding}
    <div class="form" data-no-drag>
      <input
        class="w-input"
        bind:value={name}
        onkeydown={onEnter}
        maxlength="60"
        placeholder="Nom (Netflix, salle de sport…)"
        aria-label="Nom de l'abonnement"
      />
      <div class="w-row">
        <input
          class="w-input grow"
          bind:value={amount}
          onkeydown={onEnter}
          inputmode="decimal"
          placeholder="Montant (€)"
          aria-label="Montant en euros"
        />
        <select class="w-input" bind:value={every} aria-label="Rythme">
          {#each Object.entries(EVERY) as [id, label] (id)}<option value={id}>par {label}</option
            >{/each}
        </select>
      </div>
      <label class="w-field">
        Date d'un prélèvement
        <input class="w-input" type="date" bind:value={start} onkeydown={onEnter} />
      </label>
      <div class="w-row">
        <button type="button" class="action primary" disabled={!valid} onclick={add}>Ajouter</button>
        <button type="button" class="action" onclick={() => (adding = false)}>Annuler</button>
      </div>
    </div>
  {:else if list.length}
    <p class="total">
      {euros(perMonth)}<span> / mois</span>
    </p>
    <p class="w-hint">
      {euros(perMonth * 12)} par an · {euros(thisMonth)} encore prélevés ce mois-ci
    </p>
    <ul class="w-list">
      {#each list as sub (sub.id)}
        <li class="sub" class:soon={sub.days <= 1}>
          {#if editing}
            <button
              type="button"
              class="w-icon"
              aria-label="Retirer {sub.name}"
              onclick={() => remove(sub.id)}><XIcon size={12} aria-hidden="true" /></button
            >
          {/if}
          <span class="name" title={sub.name}>{sub.name}</span>
          <span class="price">{euros(sub.amount, true)}<small>/{EVERY[sub.every]}</small></span>
          <span class="when" title="Prochain prélèvement">
            {short.format(new Date(`${sub.next}T00:00`)).replace('.', '')} · {when(sub.days)}
          </span>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="w-message">Ajoute tes abonnements (+) pour voir ce qu'ils coûtent vraiment.</p>
  {/if}
</div>

<style>
  .total {
    margin: 0;
    font-size: clamp(22px, 12cqmin, 34px);
    font-weight: var(--weight-light);
    line-height: 1.1;
    font-variant-numeric: tabular-nums;
  }

  .total span {
    font-size: var(--text-14);
    color: var(--text-muted);
  }

  .sub {
    min-height: 28px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: var(--text-13);
  }

  .name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .price {
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .price small {
    font-size: var(--text-11);
    color: var(--text-faint);
  }

  .when {
    min-width: 110px;
    text-align: right;
    font-size: var(--text-12);
    color: var(--text-faint);
    white-space: nowrap;
  }

  .soon .when {
    color: var(--accent);
  }

  .form {
    display: flex;
    flex-direction: column;
    gap: 6px;
    overflow-y: auto;
  }

  .grow {
    flex: 1;
  }

  .action:disabled {
    opacity: 0.5;
    cursor: default;
  }

  @container (max-width: 330px) {
    .when {
      min-width: 0;
    }
    .price small {
      display: none;
    }
  }

  @container (max-height: 200px) {
    .w-hint {
      display: none;
    }
  }
</style>
