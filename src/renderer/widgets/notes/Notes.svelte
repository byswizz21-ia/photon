<script lang="ts">
  // Bloc-notes partagé entre profils : enregistré peu après la dernière frappe.
  import { shared } from '../../lib/shared.svelte'
  import type { WidgetProps } from '../types'
  import type { NotesSettings } from './manifest'

  // Aucun réglage : props déclarées pour le type seulement (voir System.svelte).
  // eslint-disable-next-line no-empty-pattern
  let {}: WidgetProps<NotesSettings> = $props()

  const MAX_CHARS = 100_000
  const notes = shared('notes', (raw) => {
    const text = (raw as { text?: unknown } | null)?.text
    return { text: typeof text === 'string' ? text.slice(0, MAX_CHARS) : '' }
  })
</script>

<div class="widget">
  <span class="label" aria-hidden="true">Notes</span>
  <textarea
    bind:value={notes.value.text}
    oninput={() => notes.save()}
    disabled={!notes.ready}
    maxlength={MAX_CHARS}
    spellcheck="true"
    placeholder="Une idée, un numéro, une liste…"
    aria-label="Notes"></textarea>
</div>

<style>
  .widget {
    box-sizing: border-box;
    height: 100%;
    padding: clamp(12px, 9cqmin, 20px);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .label {
    font-size: 12px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-faint);
  }

  textarea {
    flex: 1;
    min-height: 0;
    padding: 0;
    border: 0;
    outline: 0;
    resize: none;
    background: none;
    color: var(--text);
    font: inherit;
    font-size: 14px;
    line-height: 1.5;
    user-select: text;
  }

  textarea::placeholder {
    color: var(--text-faint);
  }
</style>
