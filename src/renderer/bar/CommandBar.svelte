<script lang="ts">
  // Barre de commande : apps, fichiers, sites, calculs, commandes (src/main/search/), et Claude
  // (Tab, « ? » ou dernière ligne) avec la même conversation que le widget. Dans l'en-tête de
  // Photon, ou seule en mini-mode (2e raccourci) : la fenêtre suit alors la hauteur de la barre.
  // Clavier : ↑ ↓ choisir, Entrée ouvrir, Ctrl+Entrée ouvrir le dossier, Tab Claude, Échap effacer.
  import MagnifyingGlassIcon from 'phosphor-svelte/lib/MagnifyingGlassIcon'
  import type { ClaudeState, SearchResult } from '../../shared/api'
  import Approval from '../widgets/claude/Approval.svelte'
  import Markdown from '../widgets/claude/Markdown.svelte'
  import ResultIcon from './ResultIcon.svelte'

  let { mini = false, onaction }: { mini?: boolean; onaction: (id: string) => void } = $props()

  let query = $state('')
  let results = $state.raw<SearchResult[]>([])
  let selected = $state(0)
  let confirmId = $state('') // commande lourde : 1re Entrée = « encore une fois pour confirmer »
  let notice = $state('')
  let asking = $state(false) // réponse de Claude affichée sous la barre
  let claude = $state.raw<ClaudeState>()
  let input = $state<HTMLInputElement>()
  let root = $state<HTMLElement>()
  let seq = 0 // réponses arrivées dans le désordre : seule la dernière recherche compte

  async function update(text: string): Promise<void> {
    const n = ++seq
    const found = await window.photon.search(text)
    if (n !== seq) return
    // Mini-mode : pas d'actions sur la grille, elle n'est pas affichée.
    results = mini ? found.filter((r) => r.kind !== 'action') : found
    selected = 0
    confirmId = ''
    notice = ''
  }

  function reset(): void {
    query = ''
    asking = false
    void update('')
  }

  // Chaque ouverture repart d'une barre vide, prête à taper. Le mini-mode crée sa barre juste
  // après l'événement d'ouverture : elle s'initialise donc aussi à sa création.
  const ready = (): void => {
    reset()
    requestAnimationFrame(() => input?.focus())
  }
  $effect(() => {
    if (mini) ready()
    return window.photon.onShow(ready)
  })

  $effect(() => {
    let alive = true
    void window.photon.claudeState().then((state) => alive && (claude ??= state))
    const off = window.photon.onClaude((state) => (claude = state))
    return () => {
      alive = false
      off()
    }
  })

  // Mini-mode : la fenêtre prend la hauteur de la barre (résultats et réponse compris).
  $effect(() => {
    if (!mini || !root) return
    const element = root
    const observer = new ResizeObserver(() => window.photon.barResize(element.offsetHeight))
    observer.observe(element)
    return () => observer.disconnect()
  })

  const claudeText = (): string => query.replace(/^\?/, '').trim()

  async function ask(): Promise<void> {
    const text = claudeText()
    if (!text) return
    if (await window.photon.claudeAsk(text, [])) {
      asking = true
      query = ''
      results = []
    } else notice = claude?.busy ? 'Claude répond déjà' : 'Claude Code est introuvable'
  }

  async function open(result: SearchResult | undefined, inFolder: boolean): Promise<void> {
    if (!result) return
    if (result.id === 'claude') return ask()
    if (result.kind === 'action') {
      onaction(result.id)
      reset()
      return
    }
    if (result.confirm && confirmId !== result.id) {
      confirmId = result.id
      return
    }
    // Ouvert : Windows cache Photon, la barre repart de zéro à la prochaine ouverture.
    if (!(await window.photon.openResult(result.id, inFolder))) notice = "Impossible d'ouvrir"
  }

  function onKeydown(event: KeyboardEvent): void {
    const count = results.length
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (count) selected = (selected + (event.key === 'ArrowDown' ? 1 : count - 1)) % count
      confirmId = ''
    } else if (event.key === 'Enter' && !event.isComposing) {
      event.preventDefault()
      void open(results[selected], event.ctrlKey)
    } else if (event.key === 'Tab' && claudeText()) {
      event.preventDefault()
      void ask()
    } else if (event.key === 'Escape' && (query || asking)) {
      // 1er Échap : on vide la barre ; le suivant ferme Photon (App.svelte).
      event.preventDefault()
      event.stopPropagation()
      reset()
    }
  }

  // En-tête de Photon : liste seulement quand on tape ; mini-mode : favoris dès l'ouverture.
  const showResults = $derived(results.length > 0 && (mini || query.trim() !== '') && !asking)
  const messages = $derived(claude?.current.messages ?? [])
  const answer = $derived(messages.at(-1))
  const asked = $derived(messages.at(-2))
</script>

<div class="bar" class:mini bind:this={root} data-reveal>
  <div class="field">
    <MagnifyingGlassIcon size={18} aria-hidden="true" />
    <input
      bind:this={input}
      bind:value={query}
      oninput={() => update(query)}
      onkeydown={onKeydown}
      data-command-input
      type="text"
      spellcheck="false"
      autocomplete="off"
      placeholder="Rechercher, calculer, demander à Claude…"
      aria-label="Barre de commande"
      role="combobox"
      aria-expanded={showResults}
      aria-controls="command-results"
      aria-activedescendant={showResults ? `command-${selected}` : undefined}
    />
    {#if notice}<span class="notice">{notice}</span>{/if}
  </div>

  {#if showResults}
    <!-- Choix au clavier dans le champ (combobox) ; la souris reste un raccourci. -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <ul id="command-results" role="listbox" aria-label="Résultats">
      {#each results as result, index (result.id)}
        <li
          id="command-{index}"
          role="option"
          aria-selected={index === selected}
          onpointermove={() => (selected = index)}
          onclick={(event) => open(result, event.ctrlKey)}
        >
          <ResultIcon {result} />
          <span class="text">
            <span class="title">{result.title}</span>
            <span class="subtitle" class:warn={confirmId === result.id}>
              {confirmId === result.id ? 'Entrée encore une fois pour confirmer' : result.subtitle}
            </span>
          </span>
          {#if index === selected}<kbd>{result.id === 'claude' ? 'Tab' : 'Entrée'}</kbd>{/if}
        </li>
      {/each}
    </ul>
  {/if}

  {#if asking && answer?.role === 'assistant'}
    <div class="claude" aria-live="polite">
      {#if asked}<p class="asked">{asked.text}</p>{/if}
      {#if answer.text}<Markdown text={answer.text} />{/if}
      {#if answer.status}<p class="status">{answer.status}</p>{/if}
      {#if answer.error}<p class="error">{answer.error}</p>{/if}
      {#if claude?.approval}<Approval approval={claude.approval} />{/if}
    </div>
  {/if}
</div>

<style>
  .bar {
    position: relative;
    flex: 1;
    max-width: 560px;
    margin: 0 auto;
    -webkit-app-region: no-drag;
  }

  .field {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 38px;
    padding: 0 14px;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: rgb(0 0 0 / 0.2);
    color: var(--text-faint);
  }

  .field:focus-within {
    border-color: color-mix(in srgb, var(--accent) 50%, transparent);
  }

  input {
    flex: 1;
    min-width: 0;
    border: 0;
    outline: 0;
    background: none;
    color: var(--text);
    font: inherit;
    font-size: 14px;
    user-select: text;
  }

  input::placeholder {
    color: var(--text-faint);
  }

  .notice {
    font-size: 12px;
  }

  /* En-tête : liste et réponse flottent sous le champ, au-dessus de la grille. */
  ul,
  .claude {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    right: 0;
    z-index: 30;
    margin: 0;
    padding: 6px;
    border: 1px solid var(--glass-edge);
    border-radius: 18px;
    background: var(--glass-sheen), rgb(16 18 24 / 0.86);
    backdrop-filter: var(--glass-filter);
    box-shadow:
      var(--glass-rim),
      0 24px 60px -20px rgb(0 0 0 / 0.7);
  }

  ul {
    list-style: none;
  }

  li {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 7px 10px;
    border-radius: 12px;
    cursor: pointer;
  }

  li[aria-selected='true'] {
    background: rgb(255 255 255 / 0.08);
  }

  .text {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .title,
  .subtitle {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .title {
    font-size: 14px;
  }

  .subtitle {
    font-size: 12px;
    color: var(--text-faint);
  }

  .subtitle.warn {
    color: #ff9aa8;
  }

  kbd {
    flex: none;
    padding: 2px 7px;
    border: 1px solid var(--line);
    border-radius: 6px;
    font: inherit;
    font-size: 11px;
    color: var(--text-faint);
  }

  .claude {
    max-height: 360px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 14px;
    font-size: 13px;
    user-select: text;
  }

  .claude p {
    margin: 0;
  }

  .asked {
    color: var(--text-muted);
  }

  .status {
    color: var(--text-muted);
  }

  .error {
    color: #ff9aa8;
  }

  /* Mini-mode : la barre est toute la fenêtre, liste et réponse dans le flux. */
  .mini {
    max-width: none;
    padding: 12px;
  }

  .mini .field {
    height: 44px;
    border-radius: 14px;
  }

  .mini input {
    font-size: 16px;
  }

  .mini ul,
  .mini .claude {
    position: static;
    margin-top: 8px;
    border: 0;
    background: none;
    backdrop-filter: none;
    box-shadow: none;
    padding: 0;
  }

  .mini .claude {
    max-height: 420px;
    padding: 4px 6px;
  }
</style>
