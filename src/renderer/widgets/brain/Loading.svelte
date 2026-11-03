<script lang="ts">
  // Attente d'une réponse de Claude : étapes qui défilent et lignes fantômes.
  import SparkleIcon from 'phosphor-svelte/lib/SparkleIcon'
  import { onDestroy } from 'svelte'

  let { steps }: { steps: string[] } = $props()

  let index = $state(0)
  const timer = setInterval(() => (index = Math.min(index + 1, steps.length - 1)), 4000)
  onDestroy(() => clearInterval(timer))
</script>

<div class="b-panel b-loading" role="status">
  <p>
    <span class="spark"><SparkleIcon size={14} weight="fill" /></span>
    {#key index}<span class="step">{steps[index]}</span>{/key}
  </p>
  <i></i><i></i><i></i>
</div>

<style>
  p {
    margin: 0 0 4px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: var(--text-13);
    color: var(--text-muted);
  }

  .spark {
    display: grid;
    color: var(--accent);
    animation: spin var(--dur-logo-turn) var(--ease-glide) infinite;
  }

  .step {
    animation: rise var(--dur-swap) var(--ease-out) both;
  }

  @keyframes spin {
    to {
      transform: rotate(180deg);
    }
  }

  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
  }
</style>
