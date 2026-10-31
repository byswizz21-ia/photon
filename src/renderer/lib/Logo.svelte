<script lang="ts">
  // Logo « point en orbite » ; dessin simplifié dédié à 20 px et moins (trait épais, sans lueur).
  let { size = 28, ink = 'currentColor' }: { size?: number; ink?: string } = $props()

  const small = $derived(size <= 20)
  const glow = $derived(Math.max(2, Math.round(size / 10)))
</script>

<svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
  {#if small}
    <path
      d="M51.1 26.1 A20 20 0 1 1 37.9 12.9"
      fill="none"
      stroke={ink}
      stroke-width="6.5"
      stroke-linecap="round"
      opacity="0.7"
    />
    <circle cx="46.14" cy="17.86" r="9.5" fill="var(--accent)" />
  {:else}
    <path
      d="M50.13 23.55 A20 20 0 1 1 40.45 13.87"
      fill="none"
      stroke={ink}
      stroke-width="3.5"
      stroke-linecap="round"
      opacity="0.6"
    />
    <circle
      cx="46.14"
      cy="17.86"
      r="7"
      fill="var(--accent)"
      style:filter="drop-shadow(0 0 {glow}px var(--accent))"
    />
  {/if}
</svg>
