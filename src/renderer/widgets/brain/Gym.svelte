<script lang="ts">
  // Onglet Entraînement (salle de sport mentale) : une séance par jour, préparée par Claude, en
  // 4 épreuves : problème, calibration, piège logique, Feynman. Chaque épreuve rapporte de l'XP ;
  // la calibration mesure dans le temps si ta confiance colle à ta justesse.
  import ArrowLeftIcon from 'phosphor-svelte/lib/ArrowLeftIcon'
  import CheckIcon from 'phosphor-svelte/lib/CheckIcon'
  import ChalkboardTeacherIcon from 'phosphor-svelte/lib/ChalkboardTeacherIcon'
  import DetectiveIcon from 'phosphor-svelte/lib/DetectiveIcon'
  import LightbulbIcon from 'phosphor-svelte/lib/LightbulbIcon'
  import PuzzlePieceIcon from 'phosphor-svelte/lib/PuzzlePieceIcon'
  import SparkleIcon from 'phosphor-svelte/lib/SparkleIcon'
  import TargetIcon from 'phosphor-svelte/lib/TargetIcon'
  import { dayKey } from '../../../shared/day'
  import type { Shared } from '../../lib/shared.svelte'
  import Choice from './Choice.svelte'
  import {
    addAttempt,
    calibration,
    doneToday,
    overconfidence,
    XP,
    type BrainData,
    type Station
  } from './data'
  import Feynman from './Feynman.svelte'
  import Gauge from './Gauge.svelte'
  import Loading from './Loading.svelte'
  import {
    judgeTask,
    PROBLEM_KINDS,
    run,
    sessionTask,
    type Explanation,
    type ProblemKind,
    type Verdict
  } from './tasks'

  let { brain, now, preview }: { brain: Shared<BrainData>; now: Date; preview: boolean } = $props()

  const STATIONS = [
    { id: 'problem', label: 'Problème', hint: 'Raisonner pas à pas', icon: PuzzlePieceIcon },
    { id: 'calibration', label: 'Calibration', hint: 'Savoir ce que tu sais', icon: TargetIcon },
    { id: 'bias', label: 'Piège logique', hint: 'Repérer le biais', icon: DetectiveIcon },
    { id: 'feynman', label: 'Feynman', hint: 'Expliquer simplement', icon: ChalkboardTeacherIcon }
  ] as const

  const today = $derived(dayKey(now))
  const done = $derived(doneToday(brain.value, now))
  const session = $derived(
    brain.value.session?.day === today
      ? sessionTask('logic', 3, []).parse(brain.value.session.value)
      : null
  )
  const answers = $derived(brain.value.session?.day === today ? brain.value.session.answers : {})

  let station = $state<Station | null>(null)
  let kind = $state<ProblemKind>('logic')
  let difficulty = $state(3)
  let busy = $state(false)
  let error = $state<string | null>(null)

  async function prepare(): Promise<void> {
    if (busy || preview) return
    busy = true
    error = null
    const reply = await run(sessionTask(kind, difficulty, brain.value.concepts))
    busy = false
    error = reply.error
    if (!reply.value) return
    brain.value.session = { day: dayKey(new Date()), value: reply.value, answers: {} }
    brain.value.concepts = [...brain.value.concepts, reply.value.concept.name].slice(-60)
    brain.save()
  }

  function finish(id: Station, score: number, answer: unknown): void {
    if (preview || !brain.value.session) return
    if (!done.has(id)) addAttempt(brain.value, id, score, new Date())
    brain.value.session.answers[id] = answer
    brain.save()
  }

  // --- Problème ---
  let solution = $state('')
  let hint = $state(false)
  let judging = $state(false)
  let showSolution = $state(false)
  const verdict = $derived(answers.problem as Verdict | undefined)

  async function judge(): Promise<void> {
    if (!session || judging || preview || !solution.trim()) return
    judging = true
    error = null
    const reply = await run(
      judgeTask(session.problem.statement, session.problem.solution, solution)
    )
    judging = false
    error = reply.error
    if (reply.value) finish('problem', reply.value.score * (hint ? 0.8 : 1), reply.value)
  }

  // --- Calibration : score de Brier ramené sur 100 (100 = confiance parfaite) ---
  let step = $state(0)
  let bets = $state<{ confidence: number; correct: boolean }[]>([])

  function bet(correct: boolean, confidence: number): void {
    bets.push({ confidence, correct })
    if (!preview) {
      brain.value.bets.push({ confidence, correct })
      brain.save()
    }
  }

  function nextBet(total: number): void {
    if (step + 1 < total) {
      step++
      return
    }
    const brier =
      bets.reduce((s, b) => s + (b.confidence / 100 - (b.correct ? 1 : 0)) ** 2, 0) / bets.length
    finish('calibration', 100 * (1 - brier), {
      right: bets.filter((b) => b.correct).length,
      total: bets.length
    })
    step = 0
    bets = []
  }

  const chart = $derived(calibration(brain.value.bets))
  const bias = $derived(overconfidence(brain.value.bets))

  // Aperçu du contenu du jour sur chaque tuile.
  function peek(id: Station): string {
    if (!session) return ''
    if (id === 'problem') return session.problem.title || session.problem.statement
    if (id === 'calibration') return `${session.calibration.length} questions de culture générale`
    if (id === 'bias') return session.bias.scenario
    return session.concept.name
  }

  // Meilleure note du jour par épreuve.
  const scores = $derived(
    new Map(
      brain.value.attempts
        .filter((a) => a.day === today)
        .map((a) => [a.station, Math.round(a.score)] as const)
    )
  )

  // 14 derniers jours : intensité selon révisions et épreuves faites.
  const week = $derived(
    Array.from({ length: 14 }, (_, i) => {
      const day = dayKey(now, i - 13)
      const reviews = brain.value.reviews[day] ?? 0
      const gym = brain.value.attempts.filter((a) => a.day === day).length
      return { day, level: Math.min(1, reviews / 30 + gym / 4), today: i === 13 }
    })
  )

  function open(id: Station): void {
    station = id
    error = null
    hint = false
    showSolution = false
  }
</script>

{#if station && session}
  <div class="b-scroll">
    <button type="button" class="b-back" onclick={() => (station = null)}>
      <ArrowLeftIcon size={13} />Séance du jour
    </button>

    {#if station === 'problem'}
      <span class="w-label">{session.problem.kind}</span>
      <p class="b-title">{session.problem.title}</p>
      <p class="b-text statement">{session.problem.statement}</p>
      {#if verdict}
        <div class="verdict b-panel">
          <Gauge value={verdict.score} />
          <div>
            <p class="b-title small">{verdict.verdict}</p>
            <p class="b-text">{verdict.feedback}</p>
          </div>
        </div>
        {#if showSolution}
          <div class="b-panel pad">
            <span class="w-label">Solution</span>
            <p class="b-text">{session.problem.solution}</p>
          </div>
        {:else}
          <button type="button" class="b-ghost start" onclick={() => (showSolution = true)}
            >Voir la solution</button
          >
        {/if}
      {:else if judging}
        <Loading steps={['Claude relit ton raisonnement…', 'Il compare à la solution…']} />
      {:else}
        {#if hint}
          <p class="hint b-panel">
            <LightbulbIcon size={14} weight="fill" />{session.problem.hint}
          </p>
        {/if}
        <textarea
          class="w-input"
          rows="5"
          placeholder="Ton raisonnement et ta réponse. Écris les étapes : c'est elles qui sont notées."
          bind:value={solution}></textarea>
        <div class="row">
          {#if !hint}
            <button type="button" class="b-ghost" onclick={() => (hint = true)}>
              <LightbulbIcon size={14} />Indice (−20 %)
            </button>
          {/if}
          <button
            type="button"
            class="b-primary push"
            disabled={preview || !solution.trim()}
            onclick={judge}
          >
            <SparkleIcon size={14} weight="fill" />Corriger
          </button>
        </div>
      {/if}
    {:else if station === 'calibration'}
      {@const result = answers.calibration as { right: number; total: number } | undefined}
      {#if result}
        <div class="verdict b-panel">
          <span class="b-score">{result.right}/{result.total}</span>
          <p class="b-text">
            Bonnes réponses aujourd'hui. Ce qui compte : que ta confiance colle à ta justesse.
          </p>
        </div>
      {:else}
        <span class="w-label">Question {step + 1} sur {session.calibration.length}</span>
        {#key step}
          <Choice
            mcq={session.calibration[step]!}
            confidence
            next={step + 1 < session.calibration.length ? 'Suivant' : 'Terminer'}
            onanswer={bet}
            onnext={() => nextBet(session.calibration.length)}
          />
        {/key}
      {/if}
      <div class="chart b-panel" aria-label="Calibration : justesse réelle par niveau de confiance">
        <span class="w-label">Ta calibration</span>
        <div class="bars">
          {#each chart as c (c.confidence)}
            <div class="col" title="{c.n} réponse{c.n > 1 ? 's' : ''} à {c.confidence} %">
              <div class="slot">
                <span class="ideal" style:transform="translateY({100 - c.confidence}%)"></span>
                {#if c.hit !== null}
                  <span class="hit" style:transform="scaleY({c.hit / 100})"></span>
                {/if}
              </div>
              <small>{c.confidence} %</small>
            </div>
          {/each}
        </div>
        <p class="w-hint">
          Barre : ta justesse réelle. Trait : celle que ta confiance promet.
          {#if bias === null}5 réponses au moins pour un bilan.
          {:else if Math.abs(bias) < 6}Bien calibré : ta confiance colle à tes résultats.
          {:else if bias > 0}Trop sûr de toi de {Math.round(bias)} points en moyenne.
          {:else}Trop prudent de {Math.round(-bias)} points : tu sais plus que tu ne crois.{/if}
        </p>
      </div>
    {:else if station === 'bias'}
      {@const picked = answers.bias as { correct: boolean } | undefined}
      <p class="b-panel pad scenario">{session.bias.scenario}</p>
      {#if picked}
        <p class="b-text">
          {picked.correct ? 'Bien vu.' : 'Raté cette fois.'} Réponse :
          <b>{session.bias.options[session.bias.answer]}</b>. {session.bias.why}
        </p>
      {:else}
        <Choice
          mcq={session.bias}
          next="Terminer"
          onanswer={(correct) => finish('bias', correct ? 100 : 0, { correct })}
          onnext={() => (station = null)}
        />
      {/if}
    {:else}
      <Feynman
        {brain}
        {preview}
        concept={session.concept.name}
        why={session.concept.why}
        result={(answers.feynman as Explanation | undefined) ?? null}
        onresult={(r) => finish('feynman', r.score, r)}
      />
    {/if}
    {#if error}<p class="b-error">{error}</p>{/if}
  </div>
{:else}
  <div class="gym">
    <div class="head">
      <div class="today">
        <div class="dots" aria-label="{done.size} épreuves sur 4 aujourd'hui">
          {#each STATIONS as s (s.id)}<span class:on={done.has(s.id)}></span>{/each}
        </div>
        <p class="b-title">
          {#if !session}Séance du jour
          {:else if done.size === 4}Séance terminée, bravo
          {:else}{4 - done.size} épreuve{4 - done.size > 1 ? 's' : ''} à faire{/if}
        </p>
        <p class="w-hint">10 minutes par jour, dans l'ordre que tu veux.</p>
      </div>
      <div class="week" aria-label="Activité des 14 derniers jours">
        {#each week as d (d.day)}
          <span
            class:today={d.today}
            style:--level={d.level}
            title="{d.day} : {d.level ? 'actif' : 'repos'}"
          ></span>
        {/each}
      </div>
    </div>

    {#if busy}
      <Loading
        steps={[
          'Claude choisit un problème à ta taille…',
          'Il écrit tes questions de calibration…',
          'Il cache un piège logique dans une histoire…',
          'Il choisit une notion à expliquer…',
          'Dernières vérifications…'
        ]}
      />
    {:else if session}
      <div class="stations">
        {#each STATIONS as s (s.id)}
          <button
            type="button"
            class="station b-panel"
            class:done={done.has(s.id)}
            onclick={() => open(s.id)}
          >
            <span class="icon"><s.icon size={20} weight="duotone" /></span>
            <span class="label">{s.label}</span>
            <span class="hint">{s.hint}</span>
            <span class="peek">{peek(s.id)}</span>
            <span class="xp">
              {#if done.has(s.id)}<CheckIcon size={12} weight="bold" />{scores.get(
                  s.id
                )}/100{:else}+{XP[s.id]} XP{/if}
            </span>
          </button>
        {/each}
      </div>
    {:else}
      <div class="setup b-panel">
        <span class="w-label">Type de problème</span>
        <div class="w-chips">
          {#each Object.entries(PROBLEM_KINDS) as [id, label] (id)}
            <button
              type="button"
              class="w-chip"
              class:selected={kind === id}
              onclick={() => (kind = id as ProblemKind)}>{label}</button
            >
          {/each}
        </div>
        <span class="w-label">Difficulté</span>
        <div class="w-chips">
          {#each [1, 2, 3, 4, 5] as d (d)}
            <button
              type="button"
              class="w-chip"
              class:selected={difficulty === d}
              onclick={() => (difficulty = d)}
            >
              {d}
            </button>
          {/each}
        </div>
        <button type="button" class="b-primary start" disabled={preview} onclick={prepare}>
          <SparkleIcon size={14} weight="fill" />Préparer ma séance
        </button>
        {#if error}<p class="b-error">{error}</p>{/if}
      </div>
    {/if}
  </div>
{/if}

<style>
  .gym {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 14px;
    overflow-y: auto;
  }

  .head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  .today {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  /* Frise d'activité : un carré par jour, plus lumineux les jours chargés. */
  .week {
    display: grid;
    grid-template-columns: repeat(7, 12px);
    gap: 4px;
  }

  .week span {
    width: 12px;
    height: 12px;
    border-radius: var(--radius-bar);
    background: color-mix(in srgb, var(--accent) calc(var(--level) * 85%), var(--white-6));
  }

  .week span.today {
    outline: 1px solid var(--text-faint);
    outline-offset: 1px;
  }

  .peek {
    grid-column: 1 / -1;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
    margin-top: 10px;
    font-size: var(--text-13);
    line-height: 1.45;
    color: var(--text-secondary);
  }

  .dots {
    display: flex;
    gap: 5px;
    margin-bottom: 4px;
  }

  .dots span {
    width: 22px;
    height: 4px;
    border-radius: var(--radius-bar);
    background: var(--white-8);
  }

  .dots span.on {
    background: var(--accent);
    box-shadow: var(--glow-bar);
  }

  .stations {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-auto-rows: minmax(120px, 1fr);
    gap: 10px;
  }

  .station {
    position: relative;
    display: grid;
    grid-template-columns: auto 1fr;
    grid-template-rows: auto auto auto 1fr;
    column-gap: 12px;
    row-gap: 2px;
    align-content: start;
    padding: 14px;
    color: var(--text);
    text-align: left;
    cursor: pointer;
    overflow: hidden;
    transition: transform var(--dur-spring) var(--ease-spring);
  }

  .station::after {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(
      ellipse 80% 70% at 0% 0%,
      color-mix(in srgb, var(--accent) 14%, transparent),
      transparent 70%
    );
    opacity: 0;
    transition: opacity var(--dur-hover) var(--ease-out);
    pointer-events: none;
  }

  .station:hover {
    transform: translateY(var(--hover-lift));
  }

  .station:hover::after {
    opacity: 1;
  }

  .station:active {
    transform: scale(var(--press-scale));
  }

  .icon {
    grid-row: span 2;
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    border-radius: var(--radius-icon);
    border: 1px solid var(--border-accent-soft);
    background: var(--surface-accent-soft);
    color: var(--accent);
  }

  .label {
    font-size: var(--text-14);
    font-weight: var(--weight-semibold);
  }

  .hint {
    font-size: var(--text-12);
    color: var(--text-faint);
  }

  .xp {
    grid-column: 1 / -1;
    align-self: end;
    justify-self: start;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-top: 8px;
    font-size: var(--text-12);
    font-weight: var(--weight-medium);
    color: var(--accent);
  }

  .station.done .icon {
    border-color: color-mix(in srgb, var(--rise) 45%, transparent);
    background: color-mix(in srgb, var(--rise) 14%, transparent);
    color: var(--rise);
  }

  .station.done .xp {
    color: var(--rise);
  }

  .setup {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 16px;
  }

  .start {
    align-self: flex-start;
    margin-top: 4px;
  }

  .row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .push {
    margin-left: auto;
  }

  .statement,
  .scenario {
    color: var(--text);
  }

  .scenario {
    margin: 0;
    font-size: var(--text-13);
    line-height: 1.55;
  }

  .pad {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 12px 14px;
  }

  .hint.b-panel {
    margin: 0;
    display: flex;
    gap: 8px;
    padding: 10px 12px;
    font-size: var(--text-13);
    line-height: 1.5;
    color: var(--accent-orange);
  }

  .verdict {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 14px;
  }

  .verdict > div {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .b-title.small {
    font-size: var(--text-14);
  }

  .chart {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px 14px;
  }

  .bars {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
  }

  .col {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .col small {
    font-size: var(--text-11);
    color: var(--text-faint);
    font-variant-numeric: tabular-nums;
  }

  /* Barre = justesse réelle ; trait = justesse visée (la confiance annoncée). */
  .slot {
    position: relative;
    width: 100%;
    height: 64px;
    border-radius: var(--radius-bar);
    background: var(--white-4);
    overflow: hidden;
  }

  .hit {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to top,
      color-mix(in srgb, var(--accent) 35%, transparent),
      var(--accent)
    );
    transform-origin: 50% 100%;
    transition: transform var(--dur-fill) var(--ease-out);
  }

  /* Calque de la hauteur du créneau : son bord haut descend à la justesse visée. */
  .ideal {
    position: absolute;
    inset: 0;
    z-index: 1;
    border-top: 2px solid var(--text);
    opacity: 0.7;
  }

  @container (max-width: 420px) {
    .stations {
      grid-template-columns: minmax(0, 1fr);
      grid-auto-rows: auto;
    }
  }
</style>
