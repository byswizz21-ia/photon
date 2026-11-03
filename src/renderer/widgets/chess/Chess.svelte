<script lang="ts">
  // Quatre modes : problème du jour (série de jours), entraînement (problèmes à la chaîne),
  // contre l'ordi (bot dans un Web Worker) et à deux. Les parties en cours et la série sont
  // gardées dans data/chess.json ; le mode, le niveau et la couleur dans les réglages du widget.
  import { Chess } from 'chess.js'
  import { onDestroy, untrack } from 'svelte'
  import ArrowRightIcon from 'phosphor-svelte/lib/ArrowRightIcon'
  import ArrowUUpLeftIcon from 'phosphor-svelte/lib/ArrowUUpLeftIcon'
  import ArrowsDownUpIcon from 'phosphor-svelte/lib/ArrowsDownUpIcon'
  import EyeIcon from 'phosphor-svelte/lib/EyeIcon'
  import FireIcon from 'phosphor-svelte/lib/FireIcon'
  import LightbulbIcon from 'phosphor-svelte/lib/LightbulbIcon'
  import PlusIcon from 'phosphor-svelte/lib/PlusIcon'
  import type { ChessPuzzle } from '../../../shared/api'
  import { dayKey } from '../../../shared/day'
  import { pollWhileVisible } from '../../lib/poll.svelte'
  import { shared } from '../../lib/shared.svelte'
  import type { WidgetProps } from '../types'
  import Board from './Board.svelte'
  import type { BotReply, BotRequest } from './bot.worker'
  import type { Level } from './engine'
  import type { ChessMode, ChessSettings } from './manifest'
  import { LEVELS, liveStreak, nextStreak, parseSaved, themeLabels } from './saved'

  let { settings, save, preview }: WidgetProps<ChessSettings> = $props()

  const MODES: { id: ChessMode; label: string }[] = [
    { id: 'daily', label: 'Du jour' },
    { id: 'train', label: 'Entraînement' },
    { id: 'bot', label: 'Ordi' },
    { id: 'duo', label: 'À deux' }
  ]
  const LEVEL_IDS: Level[] = [1, 2, 3]
  const COLORS = [
    { id: 'w', label: 'Avec les Blancs' },
    { id: 'b', label: 'Avec les Noirs' },
    { id: 'random', label: 'Couleur au hasard' }
  ] as const
  const START = new Chess().fen()
  const REPLY_MS = 450 // réponse adverse d'un problème : le temps de voir son coup

  const saved = shared('chess', parseSaved)
  const mode = $derived(MODES.some((m) => m.id === settings.mode) ? settings.mode : 'daily')
  const level = $derived<Level>(settings.level === 1 || settings.level === 3 ? settings.level : 2)

  // Partie affichée : objet chess.js (non réactif) et son miroir pour l'affichage.
  let game = new Chess()
  let fen = $state(START)
  let last = $state<string | null>(null)
  let flipped = $state(false)
  let token = 0 // change à chaque nouvelle partie : les réponses en retard sont ignorées

  // Problèmes
  let daily = $state.raw<ChessPuzzle | null>(null)
  let puzzle = $state.raw<ChessPuzzle | null>(null)
  let step = 0 // prochain coup de la solution
  let status = $state<'loading' | 'offline' | 'play' | 'wrong' | 'solved' | 'shown'>('loading')
  let hint = $state<string | null>(null)
  let helped = false // solution montrée : pas compté

  // Contre l'ordi
  let thinking = $state(false)
  let worker: Worker | null = null

  const uci = (g: Chess): string[] =>
    g.history({ verbose: true }).map((m) => m.from + m.to + (m.promotion ?? ''))

  function apply(g: Chess, move: string): boolean {
    try {
      g.move({ from: move.slice(0, 2), to: move.slice(2, 4), promotion: move[4] })
      return true
    } catch {
      return false
    }
  }

  function show(lastMove: string | null): void {
    fen = game.fen()
    last = lastMove
    hint = null
  }

  // --- Problèmes ------------------------------------------------------------------------------

  function startPuzzle(p: ChessPuzzle): void {
    token++
    puzzle = p
    game = new Chess(p.fen)
    step = 0
    helped = false
    status = 'play'
    show(p.lastMove)
  }

  // Problème du jour déjà réussi : position finale.
  function startDaily(): void {
    if (!daily) {
      status = 'loading'
      return
    }
    startPuzzle(daily)
    if (saved.value.solvedId === daily.id) {
      for (const move of daily.solution) apply(game, move)
      step = daily.solution.length
      status = 'solved'
      show(daily.solution.at(-1) ?? null)
    }
  }

  async function nextPuzzle(): Promise<void> {
    if (preview) return
    const t = ++token
    status = 'loading'
    const p = await window.photon.chessPuzzle('next')
    if (t !== token || mode !== 'train') return
    if (p) startPuzzle(p)
    else status = 'offline'
  }

  function solved(): void {
    status = 'solved'
    if (helped || preview || !puzzle) return
    const now = new Date()
    if (mode === 'daily') {
      const today = dayKey(now)
      saved.value.streak = nextStreak(saved.value, today, dayKey(now, -1))
      saved.value.solvedDay = today
      saved.value.solvedId = puzzle.id
    } else saved.value.trained++
    saved.save()
  }

  // Coup adverse de la solution, puis au joueur ; dernier coup : réussi.
  function reply(): void {
    const t = token
    setTimeout(() => {
      if (t !== token || !puzzle) return
      const move = puzzle.solution[step]
      if (move && apply(game, move)) {
        step++
        show(move)
      }
      if (step >= puzzle.solution.length) solved()
    }, REPLY_MS)
  }

  function puzzleMove(move: string): void {
    if (!puzzle || (status !== 'play' && status !== 'wrong')) return
    const expected = puzzle.solution[step] ?? ''
    // Promotion : la pièce attendue par le problème (le plateau propose toujours la dame).
    if (move.slice(0, 4) === expected.slice(0, 4)) move = expected
    const trial = new Chess(game.fen())
    if (!apply(trial, move)) return
    // Un autre coup qui mate est accepté aussi (comme sur Lichess).
    if (move !== expected && !trial.isCheckmate()) {
      status = 'wrong'
      return
    }
    apply(game, move)
    step++
    status = 'play'
    show(move)
    if (step >= puzzle.solution.length || trial.isCheckmate()) solved()
    else reply()
  }

  function giveHint(): void {
    hint = puzzle?.solution[step]?.slice(0, 2) ?? null
  }

  // Solution : les coups restants, un par un.
  function reveal(): void {
    if (!puzzle) return
    helped = true
    status = 'shown'
    const t = ++token // coupe la réponse adverse en attente
    const run = (): void => {
      if (t !== token || !puzzle) return
      const move = puzzle.solution[step]
      if (!move || !apply(game, move)) return
      step++
      show(move)
      setTimeout(run, REPLY_MS)
    }
    run()
  }

  // --- Parties --------------------------------------------------------------------------------

  const color = $derived(saved.value.bot.color)

  function load(moves: string[]): void {
    token++
    thinking = false
    game = new Chess()
    for (const move of moves) if (!apply(game, move)) break
    show(moves.at(-1) ?? null)
  }

  function persist(): void {
    if (preview) return
    if (mode === 'bot') saved.value.bot.moves = uci(game)
    else saved.value.duo.moves = uci(game)
    saved.save()
  }

  function botTurn(): void {
    if (mode !== 'bot' || preview || game.isGameOver() || game.turn() === color) return
    worker ??= new Worker(new URL('./bot.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = ({ data }: MessageEvent<BotReply>) => {
      if (data.id !== token) return
      thinking = false
      if (data.move && apply(game, data.move)) {
        show(data.move)
        persist()
      }
    }
    thinking = true
    const request: BotRequest = { id: ++token, fen: START, moves: uci(game), level }
    worker.postMessage(request)
  }

  function gameMove(move: string): void {
    if (!apply(game, move)) return
    show(move)
    persist()
    botTurn()
  }

  function newGame(): void {
    if (mode === 'bot') {
      const pick = settings.color === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : settings.color
      saved.value.bot.color = pick === 'b' ? 'b' : 'w'
    }
    load([])
    persist()
    botTurn()
  }

  // Annuler : contre l'ordi, on revient jusqu'à ton tour.
  function undo(): void {
    token++
    thinking = false
    game.undo()
    while (mode === 'bot' && game.turn() !== color && game.history().length) game.undo()
    const moves = uci(game)
    show(moves.at(-1) ?? null)
    persist()
    botTurn()
  }

  // --- Mode -----------------------------------------------------------------------------------

  // Changement de mode, ou données lues sur le disque : on charge ce qu'il faut. Le reste
  // (coups enregistrés, état du problème) n'est pas suivi, sinon chaque coup rechargerait tout.
  $effect(() => {
    const m = mode
    if (!saved.ready && !preview) return
    untrack(() => {
      flipped = false
      if (m === 'daily') startDaily()
      else if (m === 'train') void nextPuzzle()
      else {
        load(m === 'bot' ? saved.value.bot.moves : saved.value.duo.moves)
        botTurn()
      }
    })
  })

  // Problème du jour : cache de Photon. Nouveau (minuit passé) : affiché s'il n'est pas commencé.
  pollWhileVisible(async () => {
    now = new Date()
    const p = await window.photon.chessPuzzle('daily')
    if (!p || p.id === daily?.id) return
    daily = p
    if (mode === 'daily' && (step === 0 || status !== 'play')) startDaily()
  }, 60_000)

  onDestroy(() => worker?.terminate())

  // --- Affichage ------------------------------------------------------------------------------

  const position = $derived(new Chess(fen))
  const puzzleMode = $derived(mode === 'daily' || mode === 'train')
  const side = $derived(puzzleMode ? (puzzle?.fen.split(' ')[1] === 'b' ? 'b' : 'w') : null)
  const base = $derived(puzzleMode ? side! : mode === 'bot' ? color : 'w')
  const orientation = $derived(flipped ? (base === 'w' ? 'b' : 'w') : base)
  const movable = $derived(
    puzzleMode
      ? status === 'play' || status === 'wrong'
        ? side
        : null
      : mode === 'bot'
        ? thinking
          ? null
          : color
        : position.turn()
  )
  let now = $state(new Date())
  const streak = $derived(liveStreak(saved.value, dayKey(now), dayKey(now, -1)))
  const sideName = (c: 'w' | 'b'): string => (c === 'w' ? 'Blancs' : 'Noirs')

  const message = $derived.by((): string => {
    if (puzzleMode) {
      if (status === 'loading')
        return mode === 'daily' ? 'Lecture du problème du jour…' : 'Problème suivant…'
      if (status === 'offline') return 'Hors ligne : réessaie dans un instant.'
      if (status === 'wrong') return 'Pas ce coup-là, cherche encore.'
      if (status === 'solved')
        return mode === 'daily' ? 'Résolu ! Le prochain arrive demain.' : 'Bravo, résolu !'
      if (status === 'shown') return 'Voilà la solution.'
      return `Trouve le meilleur coup pour les ${sideName(side!)}.`
    }
    if (position.isCheckmate()) {
      const winner = position.turn() === 'w' ? 'b' : 'w'
      if (mode === 'bot')
        return winner === color ? 'Échec et mat : tu as gagné !' : 'Échec et mat : l’ordi gagne.'
      return `Échec et mat : les ${sideName(winner)} gagnent.`
    }
    if (position.isStalemate()) return 'Pat : partie nulle.'
    if (position.isDraw()) return 'Partie nulle.'
    if (mode === 'bot')
      return thinking
        ? 'L’ordi réfléchit…'
        : position.inCheck()
          ? 'Échec ! À toi.'
          : 'À toi de jouer.'
    return `${position.inCheck() ? 'Échec ! ' : ''}Aux ${sideName(position.turn())}.`
  })
</script>

<div class="widget">
  <div class="layout">
    <div class="modes" role="tablist" aria-label="Mode" data-no-drag>
      {#each MODES as m (m.id)}
        <button
          type="button"
          role="tab"
          aria-selected={mode === m.id}
          class:selected={mode === m.id}
          onclick={() => save({ ...settings, mode: m.id })}>{m.label}</button
        >
      {/each}
    </div>

    <div class="stage">
      <Board
        {fen}
        {orientation}
        {movable}
        {last}
        {hint}
        onmove={(move) => (puzzleMode ? puzzleMove(move) : gameMove(move))}
      />
    </div>

    <div class="panel">
      <p class="status" class:wrong={status === 'wrong' && puzzleMode} aria-live="polite">
        {message}
      </p>
      {#if puzzleMode && puzzle}
        <p class="meta">
          {#if mode === 'daily' && streak}
            <span class="streak" title="Jours d’affilée"
              ><FireIcon size={12} aria-hidden="true" />{streak}</span
            >
          {/if}
          {#if mode === 'train' && saved.value.trained}<span>{saved.value.trained} réussis</span
            >{/if}
          <span>Niveau {puzzle.rating}</span>
          {#each themeLabels(puzzle.themes) as theme (theme)}<span>{theme}</span>{/each}
        </p>
      {/if}

      <div class="actions" data-no-drag>
        {#if puzzleMode}
          {#if status === 'play' || status === 'wrong'}
            <button type="button" class="action" onclick={giveHint}>
              <LightbulbIcon size={14} aria-hidden="true" />Indice
            </button>
            <button type="button" class="action" onclick={reveal}>
              <EyeIcon size={14} aria-hidden="true" />Solution
            </button>
          {/if}
          {#if mode === 'train' && status !== 'loading'}
            <button type="button" class="action" onclick={() => void nextPuzzle()}>
              <ArrowRightIcon size={14} aria-hidden="true" />Suivant
            </button>
          {/if}
        {:else}
          <button type="button" class="action" onclick={newGame}>
            <PlusIcon size={14} aria-hidden="true" />Nouvelle partie
          </button>
          <button type="button" class="action" disabled={fen === START && !thinking} onclick={undo}>
            <ArrowUUpLeftIcon size={14} aria-hidden="true" />Annuler
          </button>
        {/if}
        <button
          type="button"
          class="action icon"
          aria-label="Retourner l’échiquier"
          title="Retourner l’échiquier"
          onclick={() => (flipped = !flipped)}
        >
          <ArrowsDownUpIcon size={14} aria-hidden="true" />
        </button>
      </div>

      {#if mode === 'bot'}
        <div class="options" data-no-drag>
          <select
            aria-label="Niveau de l’ordi"
            value={level}
            onchange={(event) =>
              save({ ...settings, level: Number(event.currentTarget.value) as Level })}
          >
            {#each LEVEL_IDS as l (l)}<option value={l}>{LEVELS[l]}</option>{/each}
          </select>
          <select
            aria-label="Ta couleur à la prochaine partie"
            value={settings.color}
            onchange={(event) =>
              save({ ...settings, color: event.currentTarget.value as ChessSettings['color'] })}
          >
            {#each COLORS as c (c.id)}<option value={c.id}>{c.label}</option>{/each}
          </select>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .widget {
    box-sizing: border-box;
    height: 100%;
    padding: clamp(10px, 5cqmin, 18px);
    container-type: size;
  }

  /* Carte haute : modes, échiquier, panneau en colonne ; carte large : panneau à droite. */
  .layout {
    height: 100%;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto;
    gap: 8px;
  }

  .stage {
    min-height: 0;
    container-type: size;
    display: grid;
    place-items: center;
  }

  button {
    padding: 0;
    border: 0;
    font: inherit;
    cursor: pointer;
  }

  .modes {
    display: flex;
    gap: 2px;
    padding: 2px;
    border-radius: var(--radius-pill);
    background: var(--white-5);
    overflow-x: auto;
    scrollbar-width: none;
  }

  .modes button {
    flex: 1 0 auto;
    height: 24px;
    padding: 0 10px;
    border-radius: var(--radius-pill);
    background: none;
    color: var(--text-muted);
    font-size: var(--text-12);
    white-space: nowrap;
  }

  .modes button:hover {
    color: var(--text);
  }

  .modes button.selected {
    background: var(--surface-accent-soft);
    color: var(--accent);
  }

  .panel {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }

  .status {
    margin: 0;
    font-size: var(--text-14);
  }

  .status.wrong {
    color: var(--danger-text);
  }

  .meta {
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 4px 10px;
    font-size: var(--text-12);
    color: var(--text-faint);
  }

  .streak {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    color: var(--accent-orange);
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .options {
    display: flex;
    gap: 6px;
  }

  .action {
    height: var(--control-h-chip);
    padding: 0 10px;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border-radius: var(--radius-pill);
    background: var(--white-8);
    color: var(--text-muted);
    font-size: var(--text-12);
  }

  .action:hover:not(:disabled) {
    background: var(--white-12);
    color: var(--text);
  }

  .action:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .options select {
    min-width: 0;
    flex: 1 1 0;
    height: var(--control-h-chip);
    padding: 0 8px;
    border: 1px solid var(--line);
    border-radius: var(--radius-pill);
    background: var(--white-5);
    color: var(--text-muted);
    font: inherit;
    font-size: var(--text-12);
  }

  .options select option {
    background: var(--surface-option);
  }

  .action.icon {
    width: var(--control-h-chip);
    padding: 0;
    justify-content: center;
  }

  /* En dernier : l'emporte sur les règles ci-dessus. */
  @container (min-aspect-ratio: 5 / 4) {
    .layout {
      grid-template-columns: minmax(0, 1fr) minmax(200px, 40%);
      grid-template-rows: auto minmax(0, 1fr);
      column-gap: 14px;
    }

    .stage {
      grid-row: 1 / 3;
    }

    /* Colonne étroite : modes en pastilles séparées, sur deux lignes au besoin. */
    .modes {
      grid-column: 2;
      flex-wrap: wrap;
      gap: 4px;
      padding: 0;
      background: none;
    }

    .modes button:not(.selected) {
      flex: 0 0 auto;
      background: var(--white-5);
    }

    .panel {
      grid-column: 2;
      align-self: start;
    }
  }
</style>
