<script lang="ts">
  // Bloc-notes partagé entre profils (ou propre au profil) : enregistré peu après la dernière frappe.
  import OwnToggle from '../../lib/OwnToggle.svelte'
  import { profileKey, shared } from '../../lib/shared.svelte'
  import type { WidgetProps } from '../types'
  import type { NotesSettings } from './manifest'

  let { settings, editing, save }: WidgetProps<NotesSettings> = $props()

  const MAX_CHARS = 100_000
  const parse = (raw: unknown): { text: string } => {
    const text = (raw as { text?: unknown } | null)?.text
    return { text: typeof text === 'string' ? text.slice(0, MAX_CHARS) : '' }
  }
  const notes = $derived(shared(profileKey('notes', settings.own === true), parse))
</script>

<div class="widget">
  <div class="head">
    <span class="label" aria-hidden="true">Notes</span>
    {#if editing}
      <OwnToggle checked={settings.own === true} onchange={(own) => save({ ...settings, own })} />
    {/if}
  </div>
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

  .head {
    display: flex;
    justify-content: space-between;
    align-items: center;
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
