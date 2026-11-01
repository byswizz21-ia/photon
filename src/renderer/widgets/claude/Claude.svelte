<script lang="ts">
  // Barre Claude : fil de conversation, réponse mot par mot, prompts rapides sur le presse-papier,
  // fichiers glissés et captures collées. Modes Question / Agent (chaque action acceptée ici) /
  // Bypass (halo rouge). La conversation vit côté Windows (src/main/claude.ts) : elle continue
  // Photon caché et se retrouve à la réouverture.
  import ArrowUpIcon from 'phosphor-svelte/lib/ArrowUpIcon'
  import CheckIcon from 'phosphor-svelte/lib/CheckIcon'
  import ClipboardTextIcon from 'phosphor-svelte/lib/ClipboardTextIcon'
  import ClockCounterClockwiseIcon from 'phosphor-svelte/lib/ClockCounterClockwiseIcon'
  import CopyIcon from 'phosphor-svelte/lib/CopyIcon'
  import PlusIcon from 'phosphor-svelte/lib/PlusIcon'
  import StopIcon from 'phosphor-svelte/lib/StopIcon'
  import XIcon from 'phosphor-svelte/lib/XIcon'
  import type { ClaudeMode, ClaudeState } from '../../../shared/api'
  import type { WidgetProps } from '../types'
  import type { ClaudeSettings } from './manifest'
  import Approval from './Approval.svelte'
  import Markdown from './Markdown.svelte'

  // Aucun réglage : props déclarées pour le type seulement (voir widgets/system/System.svelte).
  // eslint-disable-next-line no-empty-pattern
  let {}: WidgetProps<ClaudeSettings> = $props()

  let claude = $state.raw<ClaudeState>()

  $effect(() => {
    let alive = true
    void window.photon.claudeState().then((state) => alive && (claude ??= state))
    const off = window.photon.onClaude((state) => (claude = state))
    return () => {
      alive = false
      off()
    }
  })

  const messages = $derived(claude?.current.messages ?? [])
  const busy = $derived(claude?.busy ?? false)
  const mode = $derived(claude?.mode ?? 'question')
  const approval = $derived(claude?.approval ?? null)

  const MODES: { id: ClaudeMode; label: string; hint: string }[] = [
    {
      id: 'question',
      label: 'Question',
      hint: 'Lit les fichiers donnés, ne modifie et ne lance rien'
    },
    { id: 'agent', label: 'Agent', hint: 'Agit sur le PC, chaque action te sera demandée' },
    { id: 'bypass', label: 'Bypass', hint: 'Agit sur le PC sans rien demander' }
  ]
  let confirmBypass = $state(false)

  function choose(next: ClaudeMode): void {
    confirmBypass = next === 'bypass' && mode !== 'bypass'
    if (!confirmBypass) window.photon.claudeMode(next)
  }

  let draft = $state('')
  let files = $state<string[]>([])
  let notice = $state('')
  let showHistory = $state(false)

  async function send(text: string): Promise<void> {
    if (!text.trim() || busy) return
    notice = ''
    // Copie du tableau : un proxy Svelte ($state) ne passe pas le pont IPC.
    if (await window.photon.claudeAsk(text, [...files])) {
      if (text === draft) draft = ''
      files = []
      stick = true
    }
  }

  // Prompts rapides : appliqués au texte copié.
  const QUICK = [
    {
      label: 'Corriger',
      prompt:
        'Corrige les fautes de ce texte sans changer le style. Donne seulement le texte corrigé.'
    },
    {
      label: 'Traduire',
      prompt: 'Traduis ce texte (français ↔ anglais). Donne seulement la traduction.'
    },
    { label: 'Résumer', prompt: 'Résume ce texte en quelques points.' },
    { label: 'Expliquer', prompt: 'Explique simplement ce texte.' }
  ]

  async function clipboard(): Promise<string> {
    const text = await window.photon.clipboardText()
    if (!text.trim()) notice = 'Le presse-papier ne contient pas de texte'
    return text
  }

  async function quick(prompt: string): Promise<void> {
    const text = await clipboard()
    if (text.trim()) await send(`${prompt}\n\n"""\n${text}\n"""`)
  }

  async function pasteClipboard(): Promise<void> {
    const text = await clipboard()
    if (text.trim()) draft = draft ? `${draft}\n${text}` : text
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault()
      void send(draft)
    }
  }

  // Capture d'écran collée (Ctrl+V) : enregistrée en PNG temporaire puis jointe.
  async function onPaste(event: ClipboardEvent): Promise<void> {
    const item = [...(event.clipboardData?.items ?? [])].find((i) => i.type === 'image/png')
    const blob = item?.getAsFile()
    if (!blob) return
    event.preventDefault()
    const path = await window.photon.claudeImage(new Uint8Array(await blob.arrayBuffer()))
    if (path) files = [...files, path]
    else notice = 'Capture trop lourde ou illisible'
  }

  // Fichiers glissés sur le widget : joints à la question.
  let over = $state(false)

  function onDragOver(event: DragEvent): void {
    event.preventDefault()
    over = event.dataTransfer?.types.includes('Files') ?? false
  }

  function onDragLeave(event: DragEvent & { currentTarget: HTMLElement }): void {
    const to = event.relatedTarget
    if (!(to instanceof Node && event.currentTarget.contains(to))) over = false
  }

  function onDrop(event: DragEvent): void {
    event.preventDefault()
    over = false
    const dropped = [...(event.dataTransfer?.files ?? [])].map((f) => window.photon.pathForFile(f))
    files = [...new Set([...files, ...dropped.filter(Boolean)])]
  }

  const fileName = (path: string): string => path.split(/[\\/]/).at(-1) ?? path

  // Défilement : on suit la réponse tant que l'utilisateur est en bas du fil.
  let thread = $state<HTMLElement>()
  let stick = true

  function onScroll(): void {
    if (thread) stick = thread.scrollHeight - thread.scrollTop - thread.clientHeight < 40
  }

  $effect(() => {
    void claude
    if (stick && thread) thread.scrollTop = thread.scrollHeight
  })

  // Réponse copiée : coche pendant 1,5 s.
  let copied = $state(-1)
  function copy(index: number, text: string): void {
    window.photon.copyText(text)
    copied = index
    setTimeout(() => copied === index && (copied = -1), 1500)
  }

  function open(id: string): void {
    window.photon.claudeOpen(id)
    showHistory = false
    stick = true
  }

  const dateFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })
</script>

<!-- data-no-press : appuyer dans le fil ou le champ ne fait pas « enfoncer » la carte. -->
<div
  class="widget"
  class:over
  role="group"
  aria-label="Claude"
  data-no-press
  data-bypass={mode === 'bypass' || undefined}
  ondragover={onDragOver}
  ondragleave={onDragLeave}
  ondrop={onDrop}
>
  <header>
    <span class="label">Claude</span>
    <div class="modes" role="radiogroup" aria-label="Mode de Claude">
      {#each MODES as item (item.id)}
        <button
          type="button"
          role="radio"
          class={item.id}
          aria-checked={mode === item.id}
          title={item.hint}
          onclick={() => choose(item.id)}
        >
          {item.label}
        </button>
      {/each}
    </div>
    <div class="tools">
      <button
        type="button"
        class="icon"
        aria-label="Historique"
        title="Historique"
        aria-expanded={showHistory}
        disabled={busy || !claude?.history.length}
        onclick={() => (showHistory = !showHistory)}
      >
        <ClockCounterClockwiseIcon size={16} />
      </button>
      <button
        type="button"
        class="icon"
        aria-label="Nouvelle conversation"
        title="Nouvelle conversation"
        disabled={busy || messages.length === 0}
        onclick={() => {
          window.photon.claudeNew()
          showHistory = false
        }}
      >
        <PlusIcon size={16} />
      </button>
    </div>
  </header>

  {#if confirmBypass}
    <div class="bypass-confirm" role="alertdialog" aria-label="Activer le mode Bypass">
      <p>
        <strong>Bypass</strong> : Claude agit sur ton PC (fichiers, commandes) sans rien te demander.
        Il revient en mode Question dès que Photon se ferme.
      </p>
      <div class="row">
        <button type="button" class="chip" onclick={() => (confirmBypass = false)}>Annuler</button>
        <button
          type="button"
          class="chip danger"
          onclick={() => {
            confirmBypass = false
            window.photon.claudeMode('bypass')
          }}
        >
          Activer
        </button>
      </div>
    </div>
  {/if}

  {#if claude && !claude.available}
    <p class="hint">Claude Code est introuvable côté Windows. Installe-le, puis relance Photon.</p>
  {:else if showHistory}
    <ul class="history">
      {#each claude?.history ?? [] as item (item.id)}
        <li>
          <button
            type="button"
            class:active={item.id === claude?.current.id}
            onclick={() => open(item.id)}
          >
            <span class="title">{item.title || 'Sans titre'}</span>
            <span class="date">{dateFormat.format(item.updatedAt)}</span>
          </button>
        </li>
      {/each}
    </ul>
  {:else}
    <div class="thread" bind:this={thread} onscroll={onScroll}>
      {#if messages.length === 0}
        <p class="hint">Pose une question, glisse un fichier ou colle une capture.</p>
      {/if}
      {#each messages as message, index (index)}
        {#if message.role === 'user'}
          <div class="user">
            <p>{message.text}</p>
            {#each message.files ?? [] as file (file)}
              <span class="file" title={file}>{fileName(file)}</span>
            {/each}
          </div>
        {:else}
          <div class="assistant">
            {#if message.text}<Markdown text={message.text} />{/if}
            {#if message.status}
              <p class="status"><span class="pulse" aria-hidden="true"></span>{message.status}</p>
            {/if}
            {#if message.error}<p class="error">{message.error}</p>{/if}
            {#if message.text && !message.status && !(busy && index === messages.length - 1)}
              <button
                type="button"
                class="icon small"
                aria-label="Copier la réponse"
                title="Copier la réponse"
                onclick={() => copy(index, message.text)}
              >
                {#if copied === index}<CheckIcon size={14} />{:else}<CopyIcon size={14} />{/if}
              </button>
            {/if}
          </div>
        {/if}
      {/each}
    </div>

    {#if approval}<Approval {approval} />{/if}

    <div class="quick">
      <button
        type="button"
        class="chip"
        title="Coller le texte copié dans le champ"
        onclick={pasteClipboard}
      >
        <ClipboardTextIcon size={14} /> Presse-papier
      </button>
      {#each QUICK as item (item.label)}
        <button
          type="button"
          class="chip"
          title="{item.label} le texte copié"
          disabled={busy}
          onclick={() => quick(item.prompt)}
        >
          {item.label}
        </button>
      {/each}
    </div>

    {#if files.length || notice}
      <div class="attachments">
        {#each files as file (file)}
          <span class="file" title={file}>
            {fileName(file)}
            <button
              type="button"
              aria-label="Retirer {fileName(file)}"
              onclick={() => (files = files.filter((f) => f !== file))}
            >
              <XIcon size={11} />
            </button>
          </span>
        {/each}
        {#if notice}<span class="notice">{notice}</span>{/if}
      </div>
    {/if}

    <div class="composer">
      <textarea
        rows="1"
        placeholder="Demande à Claude…"
        aria-label="Question pour Claude"
        bind:value={draft}
        onkeydown={onKeydown}
        onpaste={onPaste}></textarea>
      {#if busy}
        <button
          type="button"
          class="send"
          aria-label="Arrêter"
          title="Arrêter"
          onclick={() => window.photon.claudeStop()}
        >
          <StopIcon size={16} weight="fill" />
        </button>
      {:else}
        <button
          type="button"
          class="send"
          aria-label="Envoyer"
          title="Envoyer (Entrée)"
          disabled={!draft.trim()}
          onclick={() => send(draft)}
        >
          <ArrowUpIcon size={16} weight="bold" />
        </button>
      {/if}
    </div>
  {/if}
</div>

<style>
  .widget {
    box-sizing: border-box;
    height: 100%;
    padding: 18px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    border-radius: inherit;
    transition: box-shadow 150ms var(--ease-out);
  }

  .widget.over {
    box-shadow: inset 0 0 0 2px var(--accent);
  }

  header {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .label {
    font-size: 12px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-faint);
  }

  /* Bypass actif : halo rouge tant qu'il dure (le panneau de Photon aussi, voir App.svelte). */
  .widget[data-bypass] {
    box-shadow:
      inset 0 0 0 1px rgb(255 77 94 / 0.7),
      inset 0 0 40px -10px rgb(255 77 94 / 0.45);
  }

  .modes {
    display: flex;
    padding: 2px;
    border-radius: 999px;
    background: rgb(0 0 0 / 0.22);
  }

  .modes button {
    padding: 2px 9px;
    border: 0;
    border-radius: 999px;
    background: none;
    font-size: 11px;
    color: var(--text-faint);
  }

  .modes button:hover {
    color: var(--text);
  }

  .modes [aria-checked='true'] {
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 16%, transparent);
  }

  .modes .bypass[aria-checked='true'] {
    color: #ff8a96;
    background: rgb(255 77 94 / 0.18);
  }

  .bypass-confirm {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px 12px;
    border: 1px solid rgb(255 77 94 / 0.45);
    border-radius: 14px;
    background: rgb(255 77 94 / 0.1);
    font-size: 12px;
  }

  .bypass-confirm p {
    margin: 0;
  }

  .row {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
  }

  .chip.danger {
    border-color: transparent;
    background: #ff4d5e;
    color: #fff;
  }

  .tools {
    margin-left: auto;
    display: flex;
    gap: 4px;
  }

  button {
    cursor: pointer;
  }

  button:disabled {
    cursor: default;
    opacity: 0.4;
  }

  .icon {
    width: 30px;
    height: 30px;
    display: grid;
    place-items: center;
    padding: 0;
    border: 1px solid transparent;
    border-radius: 9px;
    background: none;
  }

  .icon:not(:disabled):hover {
    border-color: var(--line);
    background: rgb(255 255 255 / 0.06);
  }

  .icon.small {
    width: 26px;
    height: 26px;
    margin-left: -6px;
    color: var(--text-faint);
  }

  .hint {
    margin: auto 0;
    font-size: 13px;
    color: var(--text-faint);
    text-align: center;
  }

  /* Le fil défile : seule carte qui en a besoin, une conversation n'a pas de taille fixe. */
  .thread {
    flex: 1 1 0;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 14px;
    font-size: 13px;
    user-select: text;
    scrollbar-width: thin;
    scrollbar-color: rgb(255 255 255 / 0.15) transparent;
  }

  .user {
    align-self: flex-end;
    max-width: 85%;
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 6px;
    padding: 8px 12px;
    border: 1px solid var(--glass-edge);
    border-radius: 14px 14px 4px 14px;
    background: rgb(255 255 255 / 0.07);
  }

  .user p {
    width: 100%;
    margin: 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    /* Long texte collé : 6 lignes, la suite est dans la conversation côté Claude. */
    display: -webkit-box;
    -webkit-line-clamp: 6;
    line-clamp: 6;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .assistant {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  .assistant :global(.md) {
    align-self: stretch;
  }

  .status {
    margin: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-muted);
  }

  .pulse {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 8px var(--accent);
    animation: pulse 1.2s var(--ease-out) infinite alternate;
  }

  @keyframes pulse {
    from {
      opacity: 0.35;
      transform: scale(0.8);
    }
  }

  .error {
    margin: 0;
    color: #ff9aa8;
  }

  .quick,
  .attachments {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .chip {
    min-height: 26px;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 0 10px;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: rgb(255 255 255 / 0.04);
    font-size: 12px;
    color: var(--text-muted);
    transition: transform 300ms var(--ease-spring);
  }

  .chip:not(:disabled):hover {
    color: var(--text);
    background: rgb(255 255 255 / 0.08);
  }

  .chip:not(:disabled):active {
    transform: scale(0.95);
    transition-duration: 100ms;
  }

  .file {
    max-width: 180px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--accent) 16%, transparent);
    font-size: 11px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file button {
    display: grid;
    padding: 0;
    border: 0;
    background: none;
  }

  .notice {
    font-size: 12px;
    color: var(--text-faint);
  }

  .composer {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    padding: 6px 6px 6px 12px;
    border: 1px solid var(--glass-edge);
    border-radius: 16px;
    background: rgb(0 0 0 / 0.22);
  }

  .composer:focus-within {
    border-color: color-mix(in srgb, var(--accent) 50%, transparent);
  }

  /* Grandit avec le texte jusqu'à 6 lignes. */
  textarea {
    flex: 1;
    min-height: 22px;
    max-height: 132px;
    field-sizing: content;
    margin: 4px 0;
    padding: 0;
    border: 0;
    outline: 0;
    resize: none;
    background: none;
    color: var(--text);
    font: inherit;
    font-size: 13px;
    line-height: 22px;
    user-select: text;
  }

  textarea::placeholder {
    color: var(--text-faint);
  }

  .send {
    flex: none;
    width: 30px;
    height: 30px;
    display: grid;
    place-items: center;
    padding: 0;
    border: 0;
    border-radius: 10px;
    background: var(--accent);
    color: var(--on-accent);
  }

  .history {
    flex: 1 1 0;
    min-height: 0;
    margin: 0;
    padding: 0;
    list-style: none;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .history button {
    width: 100%;
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 10px;
    border: 0;
    border-radius: 10px;
    background: none;
    font-size: 13px;
    text-align: left;
  }

  .history button:hover,
  .history button.active {
    background: rgb(255 255 255 / 0.07);
  }

  .history .title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .history .date {
    flex: none;
    color: var(--text-faint);
  }
</style>
