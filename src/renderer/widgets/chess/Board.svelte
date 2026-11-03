<script lang="ts">
  // Échiquier : 64 cases, pièces Unicode. On joue au clic (pièce puis case) ou en glissant.
  // Coups possibles en points, dernier coup, échec et indice surlignés. Ne connaît pas les
  // règles du mode : il propose un coup (UCI) à `onmove`, le parent décide.
  import { Chess, type Square } from 'chess.js'

  let {
    fen,
    orientation,
    movable,
    last = null,
    hint = null,
    onmove
  }: {
    fen: string
    orientation: 'w' | 'b'
    movable: 'w' | 'b' | null // camp que l'utilisateur peut jouer ; null : personne
    last?: string | null // dernier coup joué (UCI)
    hint?: string | null // case à montrer (indice)
    onmove(uci: string): void
  } = $props()

  // Glyphes pleins pour les deux camps, la couleur vient du CSS ; ︎ : jamais en emoji.
  const GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }

  const position = $derived(new Chess(fen))
  const files = $derived(orientation === 'w' ? 'abcdefgh' : 'hgfedcba')
  const ranks = $derived(orientation === 'w' ? '87654321' : '12345678')
  const squares = $derived([...ranks].flatMap((r) => [...files].map((f) => (f + r) as Square)))

  let selected = $state<Square | null>(null)
  let drag = $state<{ from: Square; x: number; y: number; dx: number; dy: number } | null>(null)
  let board: HTMLDivElement

  const targets = $derived(
    selected ? position.moves({ square: selected, verbose: true }).map((m) => m.to) : []
  )
  const checked = $derived(
    position.inCheck()
      ? (position.findPiece({ type: 'k', color: position.turn() })[0] ?? null)
      : null
  )

  // Position changée (coup joué, autre mode) : plus rien de sélectionné.
  $effect(() => {
    void fen
    selected = null
    drag = null
  })

  const canMove = (sq: Square): boolean => {
    const piece = position.get(sq)
    return !!piece && piece.color === movable && movable === position.turn()
  }

  function squareAt(event: PointerEvent): Square | null {
    const rect = board.getBoundingClientRect()
    const col = Math.floor(((event.clientX - rect.left) / rect.width) * 8)
    const row = Math.floor(((event.clientY - rect.top) / rect.height) * 8)
    if (col < 0 || col > 7 || row < 0 || row > 7) return null
    return (files[col]! + ranks[row]!) as Square
  }

  // Promotion : toujours en dame (le parent remplace par la pièce attendue d'un problème).
  // ponytail: pas de choix de pièce, à ajouter si quelqu'un veut sous-promouvoir contre l'ordi.
  // ponytail: souris seulement, pas de jeu au clavier.
  function play(from: Square, to: Square): void {
    const piece = position.get(from)
    const promote = piece?.type === 'p' && (to[1] === '8' || to[1] === '1') ? 'q' : ''
    selected = null
    onmove(from + to + promote)
  }

  function down(event: PointerEvent): void {
    if (event.button !== 0) return
    const sq = squareAt(event)
    if (!sq) return
    if (selected && targets.includes(sq)) return play(selected, sq)
    if (!canMove(sq)) {
      selected = null
      return
    }
    selected = sq
    drag = { from: sq, x: event.clientX, y: event.clientY, dx: 0, dy: 0 }
    board.setPointerCapture(event.pointerId)
  }

  function move(event: PointerEvent): void {
    if (!drag) return
    drag.dx = event.clientX - drag.x
    drag.dy = event.clientY - drag.y
  }

  // Lâchée sur une case possible : coup joué ; ailleurs : la pièce revient, toujours sélectionnée.
  function up(event: PointerEvent): void {
    if (!drag) return
    const sq = squareAt(event)
    const from = drag.from
    drag = null
    if (sq && sq !== from && targets.includes(sq)) play(from, sq)
  }
</script>

<div
  class="board"
  role="group"
  aria-label="Échiquier"
  data-no-drag
  bind:this={board}
  onpointerdown={down}
  onpointermove={move}
  onpointerup={up}
  onpointercancel={() => (drag = null)}
>
  {#each squares as sq, i (sq)}
    {@const piece = position.get(sq)}
    {@const dark = ('abcdefgh'.indexOf(sq[0]!) + Number(sq[1])) % 2 === 0}
    <div
      class="square"
      class:dark
      class:last={!!last && (last.startsWith(sq) || last.slice(2, 4) === sq)}
      class:selected={selected === sq}
      class:check={checked === sq}
      class:hint={hint === sq}
      class:target={targets.includes(sq)}
      class:capture={targets.includes(sq) && !!piece}
      class:grab={canMove(sq)}
      role="img"
      aria-label={sq + (piece ? ` ${piece.color === 'w' ? 'blanc' : 'noir'} ${piece.type}` : '')}
    >
      {#if i % 8 === 0}<span class="coord rank">{sq[1]}</span>{/if}
      {#if i >= 56}<span class="coord file">{sq[0]}</span>{/if}
      {#if piece}
        <span
          class="piece {piece.color}"
          class:dragging={drag?.from === sq}
          style:transform={drag?.from === sq
            ? `translate(${drag.dx}px, ${drag.dy}px) scale(1.12)`
            : undefined}>{GLYPH[piece.type]}&#xFE0E;</span
        >
      {/if}
    </div>
  {/each}
</div>

<style>
  .board {
    --sq: calc(min(100cqw, 100cqh) / 8);
    width: calc(var(--sq) * 8);
    height: calc(var(--sq) * 8);
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    grid-template-rows: repeat(8, 1fr);
    border-radius: var(--radius-tile);
    overflow: hidden;
    touch-action: none;
    user-select: none;
  }

  .square {
    position: relative;
    display: grid;
    place-items: center;
    background: var(--board-light);
  }

  .square.dark {
    background: var(--board-dark);
  }

  .square.last {
    background: color-mix(in srgb, var(--accent) 22%, var(--board-light));
  }

  .square.dark.last {
    background: color-mix(in srgb, var(--accent) 22%, var(--board-dark));
  }

  .square.selected {
    background: color-mix(in srgb, var(--accent) 45%, transparent);
  }

  .square.check {
    background: radial-gradient(circle, var(--danger) 0%, transparent 72%);
  }

  .square.hint {
    box-shadow: inset 0 0 0 3px var(--accent);
  }

  .square.grab {
    cursor: grab;
  }

  .square.target {
    cursor: pointer;
  }

  /* Case libre : point ; prise : anneau. */
  .square.target::after {
    content: '';
    position: absolute;
    width: 30%;
    height: 30%;
    border-radius: var(--radius-pill);
    background: var(--black-30);
    pointer-events: none;
  }

  .square.capture::after {
    width: 88%;
    height: 88%;
    background: none;
    box-shadow: inset 0 0 0 calc(var(--sq) * 0.07) var(--black-30);
  }

  .piece {
    position: relative;
    z-index: 1;
    font-family: 'Segoe UI Symbol', var(--font-sans);
    font-size: calc(var(--sq) * 0.78);
    line-height: 1;
    pointer-events: none;
    transition: transform var(--dur-fast) var(--ease-out);
  }

  .piece.w {
    color: var(--piece-white);
    -webkit-text-stroke: calc(var(--sq) * 0.025) var(--piece-white-edge);
    paint-order: stroke fill;
  }

  .piece.b {
    color: var(--piece-black);
    -webkit-text-stroke: calc(var(--sq) * 0.025) var(--piece-black-edge);
    paint-order: stroke fill;
  }

  .piece.dragging {
    z-index: 2;
    transition: none;
  }

  .coord {
    position: absolute;
    font-size: var(--text-11);
    color: var(--text-faint);
    pointer-events: none;
  }

  .rank {
    top: 2px;
    left: 3px;
  }

  .file {
    right: 3px;
    bottom: 1px;
  }
</style>
