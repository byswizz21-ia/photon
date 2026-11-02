<script lang="ts">
  // Pastilles d'outil, sens (encoder / décoder) quand il y en a un, texte d'entrée, résultat à
  // copier. Le résultat suit la frappe.
  import ArrowsClockwiseIcon from 'phosphor-svelte/lib/ArrowsClockwiseIcon'
  import CopyIcon from 'phosphor-svelte/lib/CopyIcon'
  import CheckIcon from 'phosphor-svelte/lib/CheckIcon'
  import type { WidgetProps } from '../types'
  import type { DevToolsSettings } from './manifest'
  import { run, type Result, type Tool } from './tools'

  let { settings, save }: WidgetProps<DevToolsSettings> = $props()

  const TOOLS: { id: Tool; label: string; ways?: [string, string]; hint: string }[] = [
    { id: 'base64', label: 'Base64', ways: ['Encoder', 'Décoder'], hint: 'Texte ou Base64…' },
    { id: 'url', label: 'URL', ways: ['Encoder', 'Décoder'], hint: 'Texte ou a%20b…' },
    { id: 'json', label: 'JSON', ways: ['Joli', 'Compact'], hint: '{"a": 1}' },
    { id: 'time', label: 'Horodatage', hint: '1793574155, 2026-11-02 14:30, ou vide : maintenant' },
    { id: 'sha256', label: 'SHA-256', hint: 'Texte à hacher…' },
    { id: 'uuid', label: 'UUID', hint: '' }
  ]
  const current = $derived(TOOLS.find((t) => t.id === settings.tool) ?? TOOLS[0]!)

  let input = $state('')
  let reverse = $state(false)
  let result: Result = $state({ ok: true, text: '' })
  let fresh = $state(0) // UUID : un nouveau à chaque clic
  let copied = $state(false)

  $effect(() => {
    const [tool, text, back] = [current.id, input, reverse]
    void fresh
    // Le dernier calcul lancé gagne (SHA-256 est asynchrone).
    let live = true
    void run(tool, text, back).then((r) => {
      if (live) result = r
    })
    return () => (live = false)
  })

  function pick(tool: Tool): void {
    reverse = false
    copied = false
    save({ ...settings, tool })
  }

  function copy(): void {
    window.photon.copyText(result.text)
    copied = true
    setTimeout(() => (copied = false), 1200)
  }
</script>

<div class="widget">
  <span class="label">Outils dev</span>
  <div class="chips" data-no-drag>
    {#each TOOLS as t (t.id)}
      <button
        type="button"
        class="chip"
        class:selected={t.id === current.id}
        onclick={() => pick(t.id)}>{t.label}</button
      >
    {/each}
  </div>
  {#if current.ways}
    <div class="ways" role="radiogroup" aria-label="Sens" data-no-drag>
      {#each current.ways as way, i (way)}
        <button
          type="button"
          role="radio"
          aria-checked={reverse === (i === 1)}
          class:selected={reverse === (i === 1)}
          onclick={() => (reverse = i === 1)}>{way}</button
        >
      {/each}
    </div>
  {/if}
  {#if current.id !== 'uuid'}
    <textarea
      bind:value={input}
      placeholder={current.hint}
      maxlength="200000"
      spellcheck="false"
      aria-label="Entrée"
      data-no-drag></textarea>
  {/if}
  <div class="out" class:error={!result.ok}>
    <pre aria-live="polite">{result.text}</pre>
    <div class="actions">
      {#if current.id === 'uuid'}
        <button type="button" class="icon" aria-label="Nouvel UUID" onclick={() => fresh++}>
          <ArrowsClockwiseIcon size={14} aria-hidden="true" />
        </button>
      {/if}
      {#if result.ok && result.text}
        <button type="button" class="icon" aria-label="Copier le résultat" onclick={copy}>
          {#if copied}<CheckIcon size={14} aria-hidden="true" />{:else}<CopyIcon
              size={14}
              aria-hidden="true"
            />{/if}
        </button>
      {/if}
    </div>
  </div>
</div>

<style>
  .widget {
    box-sizing: border-box;
    height: 100%;
    padding: clamp(12px, 8cqmin, 20px);
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow: hidden;
  }

  .label {
    font-size: var(--text-12);
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
    color: var(--text-faint);
  }

  button {
    padding: 0;
    border: 0;
    font: inherit;
    cursor: pointer;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .chip {
    height: var(--control-h-chip);
    padding: 0 10px;
    border-radius: var(--radius-pill);
    background: var(--white-5);
    color: var(--text-muted);
    font-size: var(--text-12);
  }

  .chip:hover {
    background: var(--surface-hover);
  }

  .chip.selected {
    background: var(--surface-accent-soft);
    color: var(--accent);
  }

  .ways {
    display: flex;
    align-self: flex-start;
    padding: 2px;
    border-radius: var(--radius-pill);
    background: var(--white-5);
  }

  .ways button {
    height: 24px;
    padding: 0 12px;
    border-radius: var(--radius-pill);
    background: none;
    color: var(--text-muted);
    font-size: var(--text-12);
  }

  .ways button.selected {
    background: var(--white-12);
    color: var(--text);
  }

  textarea {
    flex: 1;
    min-height: 48px;
    padding: 8px 10px;
    border: 1px solid var(--line);
    border-radius: var(--radius-input);
    background: var(--white-5);
    color: var(--text);
    font: inherit;
    font-size: var(--text-13);
    resize: none;
    outline: 0;
  }

  textarea:focus {
    border-color: var(--border-focus);
  }

  .out {
    flex: 1;
    min-height: 40px;
    position: relative;
    border-radius: var(--radius-pre);
    background: var(--black-20);
  }

  pre {
    box-sizing: border-box;
    height: 100%;
    margin: 0;
    padding: 8px 40px 8px 10px;
    overflow: auto;
    font-family: ui-monospace, Consolas, monospace;
    font-size: var(--text-12);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    user-select: text;
  }

  .error pre {
    color: var(--danger-text);
    font-family: inherit;
  }

  .actions {
    position: absolute;
    top: 4px;
    right: 4px;
    display: flex;
    gap: 2px;
  }

  .icon {
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--surface-chip);
    color: var(--text-muted);
  }

  .icon:hover {
    color: var(--text);
  }

  button:focus-visible {
    outline: var(--focus-ring);
    outline-offset: var(--focus-offset);
  }
</style>
