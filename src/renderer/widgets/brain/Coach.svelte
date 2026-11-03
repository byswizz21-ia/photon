<script lang="ts">
  // Onglet Coach : un objectif (« apprendre Rust en un mois ») devient un parcours. Claude construit
  // les étapes, un pré-test mesure le point de départ (et prépare le cerveau), puis chaque étape
  // peut devenir un paquet de cartes ou un exercice Feynman.
  import ArrowLeftIcon from 'phosphor-svelte/lib/ArrowLeftIcon'
  import BrainIcon from 'phosphor-svelte/lib/BrainIcon'
  import CardsIcon from 'phosphor-svelte/lib/CardsIcon'
  import ChalkboardTeacherIcon from 'phosphor-svelte/lib/ChalkboardTeacherIcon'
  import CheckIcon from 'phosphor-svelte/lib/CheckIcon'
  import FlagIcon from 'phosphor-svelte/lib/FlagIcon'
  import PlusIcon from 'phosphor-svelte/lib/PlusIcon'
  import SparkleIcon from 'phosphor-svelte/lib/SparkleIcon'
  import TrashIcon from 'phosphor-svelte/lib/TrashIcon'
  import type { Shared } from '../../lib/shared.svelte'
  import Choice from './Choice.svelte'
  import { addDeck, LIMITS, TEXT, type BrainData, type Goal } from './data'
  import Feynman from './Feynman.svelte'
  import Loading from './Loading.svelte'
  import { cardsTask, LEVELS, planTask, run, type Explanation, type Mcq } from './tasks'

  let {
    brain,
    now,
    preview,
    onreview
  }: { brain: Shared<BrainData>; now: Date; preview: boolean; onreview: (deck: string) => void } =
    $props()

  const MINUTES = [15, 30, 60] as const
  const WEEKS = [1, 2, 4, 8] as const

  let view = $state<'list' | 'new' | 'pretest' | 'goal'>('list')
  let goalId = $state<string | null>(null)
  const goal = $derived(brain.value.goals.find((g) => g.id === goalId) ?? null)

  // Nouveau parcours
  let topic = $state('')
  let level = $state<string>(LEVELS[0])
  let minutes = $state<number>(30)
  let weeks = $state<number>(4)
  let busy = $state(false)
  let error = $state<string | null>(null)

  // Pré-test (gardé le temps de le passer)
  let pretest = $state<Mcq[]>([])
  let index = $state(0)
  let right = $state(0)

  // Étape ouverte
  let opened = $state<number | null>(null)
  let explaining = $state<number | null>(null)
  let explanation = $state<Explanation | null>(null)
  let making = $state<number | null>(null)
  let confirm = $state(false)

  const progress = (g: Goal): number =>
    g.steps.length ? g.steps.filter((s) => s.done).length / g.steps.length : 0

  async function build(): Promise<void> {
    if (busy || preview || topic.trim().length < 3 || brain.value.goals.length >= LIMITS.goals)
      return
    busy = true
    error = null
    const reply = await run(planTask(topic.trim(), level, minutes, weeks))
    busy = false
    error = reply.error
    if (!reply.value) return
    const id = crypto.randomUUID()
    brain.value.goals.unshift({
      id,
      title: reply.value.title,
      topic: topic.trim().slice(0, TEXT.name),
      level,
      createdAt: Date.now(),
      pretest: null,
      steps: reply.value.steps.map((s) => ({ ...s, done: false, deck: null }))
    })
    brain.save()
    goalId = id
    pretest = reply.value.pretest
    opened = 0
    index = 0
    right = 0
    topic = ''
    view = 'pretest'
  }

  function nextQuestion(): void {
    if (index + 1 < pretest.length) {
      index++
      return
    }
    if (goal && !preview) {
      goal.pretest = Math.round((100 * right) / pretest.length)
      brain.save()
    }
    view = 'goal'
  }

  async function makeCards(i: number): Promise<void> {
    const step = goal?.steps[i]
    if (!goal || !step || making !== null || preview) return
    making = i
    error = null
    const source = `Sujet : ${goal.topic} (niveau ${goal.level}).\nÉtape : ${step.title}.\n${step.detail}\n\nAppuie-toi sur tes connaissances du sujet pour couvrir ce que cette étape demande de savoir.`
    const reply = await run(cardsTask(source, 10, goal.title))
    making = null
    error = reply.error
    if (!reply.value) return
    step.deck = addDeck(brain.value, `${goal.topic} · ${step.title}`, reply.value.cards)
    brain.save()
  }

  function toggle(i: number): void {
    const step = goal?.steps[i]
    if (!step || preview) return
    step.done = !step.done
    brain.save()
  }

  function remove(): void {
    if (!goal || preview) return
    if (!confirm) {
      confirm = true
      return
    }
    brain.value.goals = brain.value.goals.filter((g) => g.id !== goal.id)
    brain.save()
    confirm = false
    view = 'list'
  }

  function openGoal(id: string): void {
    goalId = id
    const steps = brain.value.goals.find((g) => g.id === id)?.steps ?? []
    opened = steps.findIndex((s) => !s.done) // prochaine étape ouverte ; -1 : tout est fait
    explaining = null
    view = 'goal'
  }

  const since = (t: number): string => {
    const days = Math.floor((now.getTime() - t) / 86_400_000)
    return days <= 0 ? "aujourd'hui" : days === 1 ? 'hier' : `il y a ${days} jours`
  }
</script>

{#if view === 'new' || (view === 'list' && !brain.value.goals.length)}
  <div class="b-scroll">
    {#if brain.value.goals.length}
      <button type="button" class="b-back" onclick={() => (view = 'list')}
        ><ArrowLeftIcon size={13} />Parcours</button
      >
    {:else}
      <div class="intro">
        <p class="b-title">Qu'est-ce que tu veux apprendre ?</p>
        <p class="b-text">
          Claude construit ton parcours : étapes concrètes, pré-test pour mesurer d'où tu pars,
          cartes de révision et exercices pour chaque étape.
        </p>
      </div>
    {/if}
    {#if busy}
      <Loading
        steps={[
          'Claude découpe le sujet en étapes…',
          'Il alterne apprendre, pratiquer, expliquer…',
          'Il écrit ton pré-test…'
        ]}
      />
    {:else}
      <div class="form b-panel">
        <label class="w-field">
          Sujet
          <input
            class="w-input"
            maxlength={TEXT.name}
            placeholder="Rust, la photo de rue, les bases de la compta…"
            bind:value={topic}
            onkeydown={(e) => e.key === 'Enter' && build()}
          />
        </label>
        <span class="w-label">Niveau</span>
        <div class="w-chips">
          {#each LEVELS as l (l)}
            <button
              type="button"
              class="w-chip"
              class:selected={level === l}
              onclick={() => (level = l)}>{l}</button
            >
          {/each}
        </div>
        <span class="w-label">Par jour</span>
        <div class="w-chips">
          {#each MINUTES as m (m)}
            <button
              type="button"
              class="w-chip"
              class:selected={minutes === m}
              onclick={() => (minutes = m)}>{m} min</button
            >
          {/each}
        </div>
        <span class="w-label">Pendant</span>
        <div class="w-chips">
          {#each WEEKS as w (w)}
            <button
              type="button"
              class="w-chip"
              class:selected={weeks === w}
              onclick={() => (weeks = w)}
            >
              {w} semaine{w > 1 ? 's' : ''}
            </button>
          {/each}
        </div>
        <button
          type="button"
          class="b-primary go"
          disabled={preview || topic.trim().length < 3}
          onclick={build}
        >
          <SparkleIcon size={14} weight="fill" />Construire mon parcours
        </button>
        {#if error}<p class="b-error">{error}</p>{/if}
      </div>
    {/if}
  </div>
{:else if view === 'pretest' && pretest.length}
  <div class="b-scroll">
    <div class="intro">
      <span class="w-label">Pré-test · {index + 1} sur {pretest.length}</span>
      <p class="w-hint">
        Rater est normal et utile : chercher une réponse avant de l'apprendre aide à mieux la
        retenir ensuite.
      </p>
    </div>
    {#key index}
      <Choice
        mcq={pretest[index]!}
        next={index + 1 < pretest.length ? 'Suivant' : 'Voir mon parcours'}
        onanswer={(correct) => correct && right++}
        onnext={nextQuestion}
      />
    {/key}
    <button type="button" class="b-back skip" onclick={() => (view = 'goal')}
      >Passer le pré-test</button
    >
  </div>
{:else if view === 'goal' && goal}
  <div class="b-scroll">
    <div class="top">
      <button type="button" class="b-back" onclick={() => (view = 'list')}
        ><ArrowLeftIcon size={13} />Parcours</button
      >
      {#if !preview}
        <button
          type="button"
          class="w-icon"
          class:danger={confirm}
          title={confirm ? 'Cliquer encore pour supprimer' : 'Supprimer le parcours'}
          aria-label={confirm ? 'Confirmer la suppression du parcours' : 'Supprimer le parcours'}
          onclick={remove}
          onblur={() => (confirm = false)}
        >
          <TrashIcon size={13} />
        </button>
      {/if}
    </div>
    <div class="goal-head">
      <p class="b-title">{goal.title}</p>
      <div class="facts">
        <span>{goal.level}</span>
        <span>Pré-test {goal.pretest === null ? 'passé' : `${goal.pretest} %`}</span>
        <span>{Math.round(progress(goal) * 100)} % fait</span>
      </div>
      <span class="track"><span style:transform="scaleX({progress(goal)})"></span></span>
    </div>

    <ol class="path">
      {#each goal.steps as step, i (i)}
        {@const last = i === goal.steps.length - 1}
        <li class:done={step.done} class:open={opened === i}>
          <button
            type="button"
            class="node"
            aria-label={step.done
              ? `Rouvrir l'étape ${i + 1}`
              : `Marquer l'étape ${i + 1} comme faite`}
            onclick={() => toggle(i)}
          >
            {#if step.done}<CheckIcon size={12} weight="bold" />{:else if last}<FlagIcon
                size={12}
                weight="fill"
              />{:else}{i + 1}{/if}
          </button>
          <div class="step">
            <button
              type="button"
              class="step-head"
              onclick={() => (opened = opened === i ? null : i)}
            >
              <span class="step-title">{step.title}</span>
              <span class="min">{step.minutes} min</span>
            </button>
            {#if opened === i}
              <p class="b-text">{step.detail}</p>
              <div class="tools">
                {#if step.deck && brain.value.decks.some((d) => d.id === step.deck)}
                  <button
                    type="button"
                    class="b-ghost"
                    onclick={() => step.deck && onreview(step.deck)}
                  >
                    <BrainIcon size={14} />Réviser les cartes
                  </button>
                {:else if making === i}
                  <span class="w-hint making"
                    ><SparkleIcon size={13} weight="fill" />Claude écrit les cartes…</span
                  >
                {:else}
                  <button
                    type="button"
                    class="b-ghost"
                    disabled={preview || making !== null}
                    onclick={() => makeCards(i)}
                  >
                    <CardsIcon size={14} />Créer les cartes
                  </button>
                {/if}
                <button
                  type="button"
                  class="b-ghost"
                  disabled={preview}
                  onclick={() => {
                    explaining = explaining === i ? null : i
                    explanation = null
                  }}
                >
                  <ChalkboardTeacherIcon size={14} />Expliquer
                </button>
                <button type="button" class="b-ghost" disabled={preview} onclick={() => toggle(i)}>
                  <CheckIcon size={14} />{step.done ? 'Pas encore fait' : 'Fait'}
                </button>
              </div>
              {#if explaining === i}
                <div class="b-panel pad">
                  <Feynman
                    {brain}
                    {preview}
                    concept={step.title}
                    result={explanation}
                    onresult={(r) => (explanation = r)}
                  />
                </div>
              {/if}
            {/if}
          </div>
        </li>
      {/each}
    </ol>
    {#if error}<p class="b-error">{error}</p>{/if}
  </div>
{:else}
  <div class="b-scroll">
    <div class="top">
      <span class="w-label">Tes parcours</span>
      <button
        type="button"
        class="b-ghost"
        disabled={preview || brain.value.goals.length >= LIMITS.goals}
        onclick={() => (view = 'new')}
      >
        <PlusIcon size={14} weight="bold" />Nouveau
      </button>
    </div>
    {#each brain.value.goals as g (g.id)}
      <button type="button" class="goal b-panel" onclick={() => openGoal(g.id)}>
        <span class="goal-title">{g.title}</span>
        <span class="w-hint">
          {g.steps.filter((s) => s.done).length} / {g.steps.length} étapes · commencé {since(
            g.createdAt
          )}
        </span>
        <span class="track"><span style:transform="scaleX({progress(g)})"></span></span>
      </button>
    {/each}
  </div>
{/if}

<style>
  .intro {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .form {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 16px;
  }

  .go {
    align-self: flex-start;
    margin-top: 4px;
  }

  .skip {
    margin-top: auto;
  }

  .top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .w-icon.danger {
    color: var(--danger-text);
    background: var(--danger-surface);
  }

  .goal-head {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .facts {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .facts span {
    height: var(--control-h-chip);
    display: inline-flex;
    align-items: center;
    padding: 0 10px;
    border-radius: var(--radius-pill);
    background: var(--white-5);
    color: var(--text-muted);
    font-size: var(--text-12);
    font-variant-numeric: tabular-nums;
  }

  .track {
    display: block;
    height: 4px;
    border-radius: var(--radius-bar);
    background: var(--white-8);
    overflow: hidden;
  }

  .track span {
    display: block;
    height: 100%;
    background: linear-gradient(90deg, var(--accent), var(--glow-secondary));
    box-shadow: var(--glow-bar);
    transform-origin: 0 50%;
    transition: transform var(--dur-fill) var(--ease-out);
  }

  /* Parcours : une ligne verticale relie les étapes ; la dernière (mini-projet) porte un drapeau. */
  .path {
    position: relative;
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .path li {
    position: relative;
    display: grid;
    grid-template-columns: 28px minmax(0, 1fr);
    gap: 10px;
  }

  .path li:not(:last-child)::before {
    content: '';
    position: absolute;
    left: 13px;
    top: 30px;
    bottom: -6px;
    width: 2px;
    background: var(--white-8);
  }

  .path li.done:not(:last-child)::before {
    background: color-mix(in srgb, var(--accent) 50%, transparent);
  }

  .node {
    position: relative;
    z-index: 1;
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
    padding: 0;
    border: 1px solid var(--line);
    border-radius: 50%;
    background: var(--surface-chip);
    color: var(--text-muted);
    font-size: var(--text-12);
    font-weight: var(--weight-semibold);
    font-variant-numeric: tabular-nums;
    cursor: pointer;
    transition: transform var(--dur-spring) var(--ease-spring);
  }

  .node:active {
    transform: scale(0.9);
  }

  .done .node {
    border-color: transparent;
    background: var(--accent);
    color: var(--on-accent);
    box-shadow: var(--glow-dot);
  }

  .step {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-bottom: 10px;
  }

  .step-head {
    min-height: 28px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 0;
    border: 0;
    background: none;
    color: var(--text);
    font-size: var(--text-14);
    font-weight: var(--weight-medium);
    text-align: left;
    cursor: pointer;
  }

  .done .step-title {
    color: var(--text-muted);
  }

  .min {
    flex: none;
    font-size: var(--text-12);
    color: var(--text-faint);
    font-variant-numeric: tabular-nums;
  }

  .tools {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .making {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--accent);
  }

  .pad {
    padding: 14px;
  }

  .goal {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 14px;
    color: var(--text);
    text-align: left;
    cursor: pointer;
    transition: transform var(--dur-spring) var(--ease-spring);
  }

  .goal:hover {
    transform: translateY(var(--hover-lift));
  }

  .goal-title {
    font-size: var(--text-14);
    font-weight: var(--weight-semibold);
  }
</style>
