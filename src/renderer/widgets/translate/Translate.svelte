<script lang="ts">
  // Langue d'arrivée en puces, texte à traduire, traduction en dessous (copiable).
  // Traduit 700 ms après la dernière frappe, ou tout de suite avec Ctrl+Entrée. Le texte n'est
  // jamais enregistré. Mode édition : clé DeepL.
  import CheckIcon from 'phosphor-svelte/lib/CheckIcon'
  import ClipboardTextIcon from 'phosphor-svelte/lib/ClipboardTextIcon'
  import CopyIcon from 'phosphor-svelte/lib/CopyIcon'
  import type { Translation } from '../../../shared/api'
  import type { WidgetProps } from '../types'
  import type { TranslateSettings } from './manifest'

  let { settings, editing, save, preview }: WidgetProps<TranslateSettings> = $props()

  const LANGS: [string, string][] = [
    ['fr', 'Français'],
    ['en', 'Anglais'],
    ['es', 'Espagnol'],
    ['de', 'Allemand'],
    ['it', 'Italien'],
    ['pt', 'Portugais'],
    ['ja', 'Japonais']
  ]
  const NAMES: Record<string, string> = Object.fromEntries(LANGS)
  const DELAY_MS = 700

  let text = $state('')
  let result = $state<Translation | null>(null)
  let busy = $state(false)
  let copied = $state(false)
  let timer: ReturnType<typeof setTimeout> | undefined
  let asked = 0 // dernière demande : une réponse plus ancienne arrivée en retard est ignorée

  async function run(to = settings.to): Promise<void> {
    clearTimeout(timer)
    const source = text.trim()
    if (!source || preview) {
      result = null
      return
    }
    const id = ++asked
    busy = true
    const answer = await window.photon.translate(source, to, settings.deeplKey)
    if (id !== asked) return
    result = answer
    busy = false
  }

  function typed(): void {
    clearTimeout(timer)
    timer = setTimeout(() => void run(), DELAY_MS)
  }

  function setLang(to: string): void {
    save({ ...settings, to })
    void run(to)
  }

  async function paste(): Promise<void> {
    text = (await window.photon.clipboardText()).slice(0, 5000)
    void run()
  }

  function copy(): void {
    if (!result?.text) return
    window.photon.copyText(result.text)
    copied = true
    setTimeout(() => (copied = false), 1500)
  }

  $effect(() => () => clearTimeout(timer))
</script>

<div class="w-body">
  <div class="w-head">
    <span class="w-label">Traduction</span>
    <span class="w-hint">{settings.deeplKey ? 'DeepL' : 'MyMemory'}</span>
  </div>

  <div class="w-chips" role="radiogroup" aria-label="Traduire vers">
    {#each LANGS as [code, name] (code)}
      <button
        type="button"
        class="w-chip"
        class:selected={settings.to === code}
        role="radio"
        aria-checked={settings.to === code}
        title={name}
        onclick={() => setLang(code)}>{code.toUpperCase()}</button
      >
    {/each}
  </div>

  {#if editing}
    <label class="w-field" data-no-drag>
      Clé DeepL (facultative)
      <input
        class="w-input"
        type="password"
        value={settings.deeplKey}
        placeholder="xxxxxxxx-xxxx-…:fx"
        autocomplete="off"
        onchange={(e) => save({ ...settings, deeplKey: e.currentTarget.value.trim() })}
      />
    </label>
    <p class="w-hint">
      Gratuite (500 000 caractères par mois) :
      <button
        type="button"
        class="link"
        onclick={() => window.photon.openUrl('https://www.deepl.com/fr/pro-api')}
        >créer un compte DeepL API</button
      >
    </p>
  {/if}

  <div class="source" data-no-drag>
    <textarea
      class="w-input"
      bind:value={text}
      oninput={typed}
      onkeydown={(e) => {
        if (e.key === 'Enter' && e.ctrlKey) void run()
      }}
      maxlength="5000"
      placeholder="Texte à traduire en {NAMES[settings.to]?.toLowerCase() ?? settings.to}"
      aria-label="Texte à traduire"></textarea>
    {#if !text}
      <button type="button" class="w-icon paste" aria-label="Coller" title="Coller" onclick={paste}>
        <ClipboardTextIcon size={14} aria-hidden="true" />
      </button>
    {/if}
  </div>

  {#if result || busy}
    <div class="target" class:busy aria-live="polite">
      {#if result?.error}
        <p class="error">{result.error}</p>
      {:else if result}
        <p class="text">{result.text}</p>
        <button type="button" class="w-icon" aria-label="Copier la traduction" onclick={copy}>
          {#if copied}<CheckIcon size={14} weight="bold" aria-hidden="true" />{:else}<CopyIcon
              size={14}
              aria-hidden="true"
            />{/if}
        </button>
      {/if}
    </div>
    {#if result?.from && !result.error}
      <p class="w-hint">Depuis : {NAMES[result.from] ?? result.from.toUpperCase()}</p>
    {/if}
  {/if}
</div>

<style>
  .source {
    position: relative;
    flex: 1;
    min-height: 56px;
    display: flex;
  }

  .source textarea {
    flex: 1;
  }

  .paste {
    position: absolute;
    top: 6px;
    right: 6px;
  }

  .target {
    flex: 1;
    min-height: 40px;
    display: flex;
    align-items: flex-start;
    gap: 6px;
    padding: 8px 10px;
    border-radius: var(--radius-input);
    background: var(--surface-accent-soft);
    overflow-y: auto;
    transition: opacity var(--dur-fast) var(--ease-out);
  }

  .target.busy {
    opacity: 0.6;
  }

  .text,
  .error {
    flex: 1;
    margin: 0;
    font-size: var(--text-14);
    white-space: pre-wrap;
    user-select: text;
  }

  .error {
    color: var(--danger-text);
    font-size: var(--text-13);
  }

  .link {
    padding: 0;
    border: 0;
    background: none;
    color: var(--accent);
    font-size: inherit;
    cursor: pointer;
  }
</style>
