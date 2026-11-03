<script lang="ts">
  // Note sur 100 dans un anneau : rouge, orange puis vert selon la note.
  let { value, size = 56 }: { value: number; size?: number } = $props()

  const R = 22
  const C = 2 * Math.PI * R
  const tone = $derived(
    value >= 70 ? 'var(--rise)' : value >= 40 ? 'var(--accent-orange)' : 'var(--danger)'
  )
</script>

<span class="gauge" style:width="{size}px" style:height="{size}px" style:--tone={tone}>
  <svg viewBox="0 0 50 50" aria-hidden="true">
    <circle class="track" cx="25" cy="25" r={R} />
    <circle
      class="fill"
      cx="25"
      cy="25"
      r={R}
      stroke-dasharray={C}
      stroke-dashoffset={C * (1 - value / 100)}
    />
  </svg>
  <b aria-label="{value} sur 100">{value}</b>
</span>

<style>
  .gauge {
    position: relative;
    flex: none;
    display: grid;
    place-items: center;
  }

  svg {
    position: absolute;
    inset: 0;
    transform: rotate(-90deg);
  }

  circle {
    fill: none;
    stroke-width: 4;
  }

  .track {
    stroke: var(--white-8);
  }

  .fill {
    stroke: var(--tone);
    stroke-linecap: round;
    filter: drop-shadow(0 0 5px var(--tone));
  }

  /* Apparition : transform et opacité seulement. */
  .gauge {
    animation: pop var(--dur-spring-card) var(--ease-spring) both;
  }

  b {
    font-size: var(--text-16);
    font-weight: var(--weight-semibold);
    font-variant-numeric: tabular-nums;
  }

  @keyframes pop {
    from {
      opacity: 0;
      transform: scale(0.8) rotate(-30deg);
    }
  }
</style>
