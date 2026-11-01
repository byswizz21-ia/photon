<script lang="ts">
  // Mode Agent : l'action que Claude veut faire, montrée en entier ; rien n'est accepté par défaut.
  // Utilisée par le widget Claude et la barre de commande.
  import type { ClaudeApproval } from '../../../shared/api'

  let { approval }: { approval: ClaudeApproval } = $props()
</script>

<div class="approval" role="alertdialog" aria-label="Claude demande ton accord">
  <p>{approval.title}</p>
  <pre>{approval.detail}</pre>
  <div class="row">
    <button type="button" onclick={() => window.photon.claudeApprove(approval.id, false)}>
      Refuser
    </button>
    <button
      type="button"
      class="accept"
      onclick={() => window.photon.claudeApprove(approval.id, true)}
    >
      Autoriser
    </button>
  </div>
</div>

<style>
  .approval {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px 12px;
    border: 1px solid color-mix(in srgb, var(--accent) 45%, transparent);
    border-radius: 14px;
    background: color-mix(in srgb, var(--accent) 8%, transparent);
    font-size: 12px;
  }

  p {
    margin: 0;
    font-weight: 600;
  }

  /* Le détail complet reste lisible : il défile au-delà de 8 lignes. */
  pre {
    max-height: 8lh;
    margin: 0;
    padding: 8px;
    overflow: auto;
    border-radius: 8px;
    background: rgb(0 0 0 / 0.3);
    font-size: 11px;
    line-height: 1.45;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    user-select: text;
  }

  .row {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
  }

  button {
    min-height: 26px;
    padding: 0 12px;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: rgb(255 255 255 / 0.04);
    font-size: 12px;
    color: var(--text-muted);
    cursor: pointer;
  }

  button:hover {
    color: var(--text);
  }

  .accept {
    border-color: transparent;
    background: var(--accent);
    color: var(--on-accent);
  }

  .accept:hover {
    color: var(--on-accent);
  }
</style>
