<script lang="ts">
  import Logo from './lib/Logo.svelte'

  // Mesure : deux images après l'affichage ≈ fenêtre réellement à l'écran.
  $effect(() =>
    window.photon.onShow(() =>
      requestAnimationFrame(() => requestAnimationFrame(() => window.photon.shown()))
    )
  )
</script>

<div class="panel">
  <header class="bar">
    <Logo size={28} />
    <span class="name">Photon</span>
  </header>
</div>

<style>
  .panel {
    box-sizing: border-box;
    height: 100%;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    background: var(--panel-bg);
    border: 1px solid var(--line);
    border-radius: var(--radius-panel);
  }

  .bar {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .name {
    font-size: 18px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }
</style>
