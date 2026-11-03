<script lang="ts">
  // La citation du jour, son auteur, « Une autre » et « Copier ». Mode édition : thèmes à cocher
  // et citations perso. La taille du texte suit sa longueur et la taille de la carte.
  import ArrowClockwiseIcon from 'phosphor-svelte/lib/ArrowClockwiseIcon'
  import CheckIcon from 'phosphor-svelte/lib/CheckIcon'
  import CopyIcon from 'phosphor-svelte/lib/CopyIcon'
  import { app } from '../../state.svelte'
  import type { WidgetProps } from '../types'
  import type { QuotesSettings } from './manifest'
  import { pick, pool, THEMES, type Theme } from './quotes'

  let { settings, editing, save }: WidgetProps<QuotesSettings> = $props()

  const themes = $derived(Array.isArray(settings.themes) ? settings.themes : [])
  const quotes = $derived(pool(themes, typeof settings.custom === 'string' ? settings.custom : ''))
  let skip = $state(0) // « Une autre » : pas enregistré, demain repart sur la citation du jour
  let today = $state(new Date())
  let copied = $state(false)

  // Photon ouvert un autre jour : citation du jour suivant.
  $effect(() => {
    if (app.visible) today = new Date()
  })

  const quote = $derived(pick(quotes, today, skip))
  const size = $derived(
    !quote ? 'm' : quote.text.length > 140 ? 's' : quote.text.length < 60 ? 'l' : 'm'
  )

  function toggle(theme: Theme): void {
    const next = themes.includes(theme) ? themes.filter((t) => t !== theme) : [...themes, theme]
    save({ ...settings, themes: next })
  }

  function copy(): void {
    if (!quote) return
    window.photon.copyText(quote.author ? `« ${quote.text} » — ${quote.author}` : quote.text)
    copied = true
    setTimeout(() => (copied = false), 1200)
  }
</script>

<div class="widget" class:editing>
  {#if editing}
    <span class="label">Citations</span>
    <div class="chips" data-no-drag>
      {#each Object.entries(THEMES) as [id, theme] (id)}
        <button
          type="button"
          class="chip"
          class:selected={themes.includes(id)}
          aria-pressed={themes.includes(id)}
          onclick={() => toggle(id as Theme)}>{theme.label}</button
        >
      {/each}
    </div>
    <label class="field">
      Tes citations, une par ligne
      <textarea
        value={settings.custom}
        placeholder="Le texte — L’auteur"
        maxlength="10000"
        rows="3"
        onchange={(event) => save({ ...settings, custom: event.currentTarget.value })}></textarea>
    </label>
  {:else if quote}
    <figure class={size}>
      <blockquote>{quote.text}</blockquote>
      {#if quote.author}<figcaption>{quote.author}</figcaption>{/if}
    </figure>
    <div class="actions">
      <button type="button" class="icon" aria-label="Copier la citation" onclick={copy}>
        {#if copied}<CheckIcon size={14} aria-hidden="true" />{:else}<CopyIcon
            size={14}
            aria-hidden="true"
          />{/if}
      </button>
      {#if quotes.length > 1}
        <button type="button" class="icon" aria-label="Une autre citation" onclick={() => skip++}>
          <ArrowClockwiseIcon size={14} aria-hidden="true" />
        </button>
      {/if}
    </div>
  {:else}
    <span class="label">Citations</span>
    <p class="empty">Aucun thème coché : passe en mode édition pour en choisir.</p>
  {/if}
</div>

<style>
  .widget {
    box-sizing: border-box;
    height: 100%;
    padding: clamp(12px, 8cqmin, 22px);
    display: flex;
    flex-direction: column;
    gap: 8px;
    position: relative;
    overflow: hidden;
  }

  .widget.editing {
    overflow-y: auto;
  }

  .label {
    font-size: var(--text-12);
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
    color: var(--text-faint);
  }

  figure {
    flex: 1;
    min-height: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 8px;
    overflow-y: auto;
    scrollbar-width: none;
  }

  blockquote {
    margin: 0;
    font-weight: var(--weight-light);
    letter-spacing: var(--tracking-title);
    line-height: 1.3;
    text-wrap: pretty;
  }

  blockquote::before {
    content: '« ';
    color: var(--accent);
  }

  blockquote::after {
    content: ' »';
    color: var(--accent);
  }

  /* Texte long : plus petit ; court : plus grand. cqmin suit la taille de la carte. */
  .l blockquote {
    font-size: clamp(var(--text-15), 9cqmin, var(--text-display-s));
  }

  .m blockquote {
    font-size: clamp(var(--text-14), 7cqmin, 24px);
  }

  .s blockquote {
    font-size: clamp(var(--text-13), 5.5cqmin, var(--text-18));
  }

  figcaption {
    font-size: var(--text-13);
    color: var(--text-muted);
  }

  figcaption::before {
    content: '— ';
  }

  .actions {
    position: absolute;
    right: 10px;
    bottom: 10px;
    display: flex;
    gap: 4px;
    opacity: 0;
    transition: opacity var(--dur-fast) var(--ease-out);
  }

  .widget:hover .actions,
  .actions:focus-within {
    opacity: 1;
  }

  button {
    padding: 0;
    border: 0;
    font: inherit;
    cursor: pointer;
  }

  .icon {
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
    border-radius: var(--radius-icon);
    background: var(--white-8);
    color: var(--text-muted);
  }

  .icon:hover {
    background: var(--white-12);
    color: var(--text);
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

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: var(--text-12);
    color: var(--text-muted);
  }

  .field textarea {
    padding: 8px 10px;
    border: 1px solid var(--line);
    border-radius: var(--radius-input);
    background: var(--white-5);
    color: var(--text);
    font: inherit;
    font-size: var(--text-13);
    resize: none;
  }

  .empty {
    margin: 0;
    font-size: var(--text-13);
    color: var(--text-faint);
  }
</style>
