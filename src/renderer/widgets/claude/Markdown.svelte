<script lang="ts">
  // Réponse de Claude mise en forme. Tout passe par du texte Svelte (échappé) : aucun HTML injecté.
  import CheckIcon from 'phosphor-svelte/lib/CheckIcon'
  import CopyIcon from 'phosphor-svelte/lib/CopyIcon'
  import { parseMarkdown, type Inline } from './markdown'

  let { text }: { text: string } = $props()

  const blocks = $derived(parseMarkdown(text))

  // Bloc de code copié : coche pendant 1,5 s.
  let copied = $state(-1)
  function copy(index: number, code: string): void {
    window.photon.copyText(code)
    copied = index
    setTimeout(() => copied === index && (copied = -1), 1500)
  }
</script>

{#snippet line(parts: Inline[])}
  {#each parts as part, i (i)}
    {#if part.kind === 'code'}<code>{part.text}</code>{:else if part.kind === 'bold'}<strong
        >{part.text}</strong
      >{:else}{part.text}{/if}
  {/each}
{/snippet}

<div class="md">
  {#each blocks as block, index (index)}
    {#if block.kind === 'heading'}
      <p class="heading">{@render line(block.inline)}</p>
    {:else if block.kind === 'paragraph'}
      <p>{@render line(block.inline)}</p>
    {:else if block.kind === 'list'}
      <svelte:element this={block.ordered ? 'ol' : 'ul'}>
        {#each block.items as item, i (i)}
          <li>{@render line(item)}</li>
        {/each}
      </svelte:element>
    {:else}
      <div class="code">
        <button
          type="button"
          class="copy"
          aria-label="Copier le code"
          title="Copier"
          onclick={() => copy(index, block.text)}
        >
          {#if copied === index}<CheckIcon size={14} />{:else}<CopyIcon size={14} />{/if}
        </button>
        <pre><code>{block.text}</code></pre>
      </div>
    {/if}
  {/each}
</div>

<style>
  .md {
    display: flex;
    flex-direction: column;
    gap: 8px;
    line-height: 1.5;
  }

  p,
  ul,
  ol {
    margin: 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  ul,
  ol {
    padding-left: 20px;
    white-space: normal;
  }

  .heading {
    font-weight: 600;
  }

  code {
    padding: 1px 5px;
    border-radius: 5px;
    background: rgb(255 255 255 / 0.08);
    font-family: 'Cascadia Code', Consolas, monospace;
    font-size: 0.92em;
  }

  .code {
    position: relative;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: rgb(0 0 0 / 0.3);
  }

  pre {
    margin: 0;
    padding: 10px 12px;
    overflow-x: auto;
  }

  pre code {
    padding: 0;
    background: none;
  }

  .copy {
    position: absolute;
    top: 6px;
    right: 6px;
    width: 26px;
    height: 26px;
    display: grid;
    place-items: center;
    padding: 0;
    border: 1px solid var(--line);
    border-radius: 7px;
    background: rgb(20 22 29 / 0.8);
    cursor: pointer;
    opacity: 0;
    transition: opacity 150ms var(--ease-out);
  }

  .code:hover .copy,
  .copy:focus-visible {
    opacity: 1;
  }
</style>
