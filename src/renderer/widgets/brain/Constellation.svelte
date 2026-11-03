<script lang="ts">
  // Carte des connaissances : un astre par paquet, taille selon le nombre de cartes, couleur selon
  // la mémoire (vert solide → rouge qui s'efface ; bleu : jamais révisé). Un anneau pulse autour
  // des paquets qui ont des cartes à revoir. Clic : réviser ce paquet.
  import type { Star } from './data'

  let { stars, onpick }: { stars: Star[]; onpick: (id: string) => void } = $props()

  // Dessin à la taille réelle du panneau : textes nets, astres répartis sur toute la surface.
  let W = $state(320)
  let H = $state(180)
  const GOLDEN = Math.PI * (3 - Math.sqrt(5))

  // Spirale de Fermat étirée au panneau, puis quelques passes qui écartent les astres trop
  // proches (étiquettes comprises) : places stables d'un affichage à l'autre.
  // Panneau trop serré : étiquettes au survol seulement (title), astres plus rapprochés.
  const roomy = $derived((W * (H - 34)) / Math.max(1, stars.length) > 9000)

  const placed = $derived.by(() => {
    const top = 14
    const bottom = H - 34 // place de la légende et des étiquettes
    const nodes = stars.map((star, i) => {
      const spread = Math.sqrt((i + 0.5) / Math.max(stars.length, 1)) * 0.92
      const angle = i * GOLDEN - Math.PI / 2
      return {
        ...star,
        x: W / 2 + Math.cos(angle) * spread * (W / 2 - 60),
        y: (top + bottom) / 2 + Math.sin(angle) * spread * ((bottom - top) / 2),
        r: 5 + Math.sqrt(star.count) * 1.8
      }
    })
    for (let pass = 0; pass < 80; pass++) {
      for (const a of nodes) {
        for (const b of nodes) {
          if (a === b) continue
          const dx = b.x - a.x
          const dy = b.y - a.y
          const d = Math.hypot(dx, dy) || 1
          const gap = a.r + b.r + (roomy ? 30 : 10)
          if (d >= gap) continue
          const push = (gap - d) / 4
          a.x -= (dx / d) * push
          a.y -= (dy / d) * push
          b.x += (dx / d) * push
          b.y += (dy / d) * push
        }
      }
      for (const n of nodes) {
        n.x = Math.min(W - 56, Math.max(56, n.x))
        n.y = Math.min(bottom - n.r, Math.max(top + n.r, n.y))
      }
    }
    return nodes
  })

  // Liens vers l'astre le plus proche déjà placé : une constellation, pas un graphe complet.
  const links = $derived(
    placed.slice(1).map((star, i) => {
      const before = placed.slice(0, i + 1)
      const near = before.reduce((a, b) =>
        Math.hypot(b.x - star.x, b.y - star.y) < Math.hypot(a.x - star.x, a.y - star.y) ? b : a
      )
      return { x1: near.x, y1: near.y, x2: star.x, y2: star.y }
    })
  )

  const tint = (retention: number | null): string =>
    retention === null
      ? 'var(--accent)'
      : `color-mix(in srgb, var(--rise) ${Math.round(Math.max(0, (retention - 0.5) * 200))}%, var(--danger))`

  const label = (s: Star): string =>
    `${s.name} : ${s.count} cartes, ${s.retention === null ? 'jamais révisé' : `mémoire ${Math.round(s.retention * 100)} %`}${s.due ? `, ${s.due} à revoir` : ''}`
</script>

<div class="sky" bind:clientWidth={W} bind:clientHeight={H}>
  <svg viewBox="0 0 {W} {H}" role="group" aria-label="Carte des connaissances">
    {#each links as l, i (i)}
      <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />
    {/each}
    {#each placed as s (s.id)}
      <g
        class="star"
        role="button"
        tabindex="0"
        aria-label={label(s)}
        style:--tint={tint(s.retention)}
        onclick={() => onpick(s.id)}
        onkeydown={(e) =>
          (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onpick(s.id))}
      >
        <title>{label(s)}</title>
        <circle class="halo" cx={s.x} cy={s.y} r={s.r * 2.6} />
        {#if s.due}<circle class="pulse" cx={s.x} cy={s.y} r={s.r + 4} />{/if}
        <circle class="core" cx={s.x} cy={s.y} r={s.r} />
        <text class:hidden={!roomy} x={s.x} y={s.y + s.r + 12}
          >{s.name.length > 18 ? `${s.name.slice(0, 17)}…` : s.name}</text
        >
      </g>
    {/each}
  </svg>
  <div class="legend" aria-hidden="true">
    <span><i class="solid"></i>Solide</span>
    <span><i class="weak"></i>S'efface</span>
    <span><i class="new"></i>Jamais révisé</span>
  </div>
</div>

<style>
  .sky {
    position: relative;
    min-height: 0;
    overflow: hidden;
  }

  svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  .legend {
    position: absolute;
    left: 4px;
    bottom: 2px;
    display: flex;
    gap: 12px;
    font-size: var(--text-11);
    color: var(--text-faint);
  }

  .legend span {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }

  .legend i {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }

  .solid {
    background: var(--rise);
  }

  .weak {
    background: var(--danger);
  }

  .new {
    background: var(--accent);
  }

  line {
    stroke: var(--white-12);
    stroke-width: 1;
    stroke-dasharray: 2 4;
  }

  .star {
    cursor: pointer;
    outline: none;
  }

  .halo {
    fill: var(--tint);
    opacity: 0.12;
    transition: opacity var(--dur-hover) var(--ease-out);
  }

  .core {
    fill: var(--tint);
    stroke: var(--white-18);
    stroke-width: 1;
    filter: drop-shadow(0 0 6px var(--tint));
  }

  .pulse {
    fill: none;
    stroke: var(--tint);
    stroke-width: 1.2;
    transform-box: fill-box;
    transform-origin: center;
    animation: pulse var(--dur-ripple) var(--ease-out) infinite;
  }

  text {
    fill: var(--text-muted);
    font-size: var(--text-11);
    text-anchor: middle;
    pointer-events: none;
  }

  .star:hover .halo,
  .star:focus-visible .halo {
    opacity: 0.32;
  }

  text.hidden {
    opacity: 0;
  }

  .star:hover text.hidden,
  .star:focus-visible text.hidden {
    opacity: 1;
  }

  .star:hover text,
  .star:focus-visible text {
    fill: var(--text);
  }

  @keyframes pulse {
    from {
      opacity: 0.8;
      transform: scale(1);
    }
    to {
      opacity: 0;
      transform: scale(1.8);
    }
  }
</style>
