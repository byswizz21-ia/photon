<script lang="ts">
  // Une ligne par commande : voyant (vert en cours, rouge si elle a échoué), nom, lancer / arrêter.
  // Clic sur le nom : la fin de sa sortie en dessous. État relu chaque seconde fenêtre visible.
  // Mode édition : ajouter (nom, dossier, commande) ou retirer une commande.
  import FolderOpenIcon from 'phosphor-svelte/lib/FolderOpenIcon'
  import PlayIcon from 'phosphor-svelte/lib/PlayIcon'
  import StopIcon from 'phosphor-svelte/lib/StopIcon'
  import XIcon from 'phosphor-svelte/lib/XIcon'
  import type { ScriptRun } from '../../../shared/api'
  import { pollWhileVisible } from '../../lib/poll.svelte'
  import type { WidgetProps } from '../types'
  import type { Script, ScriptsSettings } from './manifest'

  let { settings, editing, save, preview }: WidgetProps<ScriptsSettings> = $props()

  const list = $derived(Array.isArray(settings.scripts) ? settings.scripts : [])
  let runs = $state.raw<Record<string, ScriptRun>>({})
  let open = $state('')
  let output = $state<HTMLPreElement>()

  const read = async (): Promise<void> => {
    const states = await window.photon.scripts(list.map((s) => s.id))
    runs = Object.fromEntries(states.map((run) => [run.id, run]))
  }
  pollWhileVisible(read, 1_000)

  // Sortie ouverte : toujours la fin visible.
  $effect(() => {
    void runs[open]?.output
    if (output) output.scrollTop = output.scrollHeight
  })

  async function start(script: Script): Promise<void> {
    if (preview) return
    open = script.id
    await window.photon.scriptStart(script.id, script.folder, script.command)
    await read()
  }

  async function stop(script: Script): Promise<void> {
    await window.photon.scriptStop(script.id)
    await read()
  }

  const status = (run: ScriptRun | undefined): string =>
    run?.running
      ? 'running'
      : run?.code === null || run === undefined
        ? 'idle'
        : run.code === 0
          ? 'done'
          : 'failed'
  const LABELS: Record<string, string> = {
    running: 'En cours',
    idle: 'Jamais lancé',
    done: 'Terminé',
    failed: 'Échec'
  }

  let name = $state('')
  let folder = $state('')
  let command = $state('npm run dev')
  const valid = $derived(name.trim() !== '' && folder !== '' && command.trim() !== '')

  async function pick(): Promise<void> {
    const [chosen] = await window.photon.pickFolders()
    if (!chosen) return
    folder = chosen
    if (!name.trim()) name = chosen.split(/[\\/]/).filter(Boolean).pop() ?? ''
  }

  function add(): void {
    if (!valid) return
    const script = {
      id: crypto.randomUUID().slice(0, 12),
      name: name.trim().slice(0, 40),
      folder,
      command: command.trim().slice(0, 1000)
    }
    save({ ...settings, scripts: [...list, script] })
    name = ''
    folder = ''
  }

  function remove(id: string): void {
    void window.photon.scriptStop(id)
    save({ ...settings, scripts: list.filter((s) => s.id !== id) })
  }

  // Sortie de la commande ouverte, suivie du code de fin une fois arrêtée.
  const outputText = $derived.by(() => {
    const run = runs[open]
    if (!run) return 'Pas encore lancé.'
    const text = run.output || (run.running ? 'En attente de sortie…' : 'Pas encore lancé.')
    return !run.running && run.code !== null ? `${text}\n— terminé (code ${run.code})` : text
  })

  const folderName = (path: string): string => path.split(/[\\/]/).filter(Boolean).pop() ?? path
</script>

<div class="w-body">
  <div class="w-head">
    <span class="w-label">Scripts</span>
    {#if list.length}
      {@const active = list.filter((s) => runs[s.id]?.running).length}
      <span class="w-hint">{active ? `${active} en cours` : 'Tout est arrêté'}</span>
    {/if}
  </div>

  {#if list.length}
    <ul class="w-list" class:compact={open !== ''}>
      {#each list as script (script.id)}
        {@const run = runs[script.id]}
        {@const s = status(run)}
        <li class="script">
          {#if editing}
            <button
              type="button"
              class="w-icon"
              aria-label="Retirer {script.name}"
              onclick={() => remove(script.id)}><XIcon size={12} aria-hidden="true" /></button
            >
          {/if}
          <span class="dot {s}" title={LABELS[s]}></span>
          <button
            type="button"
            class="name"
            title="{script.command} · {script.folder}"
            aria-expanded={open === script.id}
            onclick={() => (open = open === script.id ? '' : script.id)}
          >
            {script.name}
            <small>{script.command}</small>
          </button>
          {#if run?.running}
            <button
              type="button"
              class="w-icon run stop"
              aria-label="Arrêter {script.name}"
              onclick={() => stop(script)}
              ><StopIcon size={14} weight="fill" aria-hidden="true" /></button
            >
          {:else}
            <button
              type="button"
              class="w-icon run"
              aria-label="Lancer {script.name}"
              onclick={() => start(script)}
              ><PlayIcon size={14} weight="fill" aria-hidden="true" /></button
            >
          {/if}
        </li>
      {/each}
    </ul>
    {#if open && list.some((s) => s.id === open)}
      <pre bind:this={output} class="output" data-no-drag>{outputText}</pre>
    {/if}
  {:else if !editing}
    <p class="w-message">Passe en mode édition (crayon) pour ajouter une commande.</p>
  {/if}

  {#if editing}
    <div class="form" data-no-drag>
      <div class="w-row">
        <input
          class="w-input grow"
          bind:value={name}
          maxlength="40"
          placeholder="Nom"
          aria-label="Nom"
        />
        <button type="button" class="action" onclick={pick} title={folder}>
          <FolderOpenIcon size={14} aria-hidden="true" />
          {folder ? folderName(folder) : 'Dossier'}
        </button>
      </div>
      <div class="w-row">
        <input
          class="w-input grow mono"
          bind:value={command}
          maxlength="1000"
          placeholder="npm run dev"
          aria-label="Commande"
          onkeydown={(e) => e.key === 'Enter' && add()}
        />
        <button type="button" class="action primary" disabled={!valid} onclick={add}>Ajouter</button
        >
      </div>
    </div>
  {/if}
</div>

<style>
  .w-list.compact {
    flex: none;
    max-height: 45%;
  }

  .script {
    min-height: 30px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .dot {
    flex: none;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--white-15);
  }

  .dot.running {
    background: var(--accent-mint);
    box-shadow: var(--glow-dot);
  }

  .dot.failed {
    background: var(--danger);
  }

  .name {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding: 0;
    border: 0;
    background: none;
    color: var(--text);
    font-size: var(--text-14);
    text-align: left;
    cursor: pointer;
    overflow: hidden;
    white-space: nowrap;
  }

  .name small {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    font-family: ui-monospace, 'Cascadia Code', Consolas, monospace;
    font-size: var(--text-11);
    color: var(--text-faint);
  }

  .run {
    color: var(--text-muted);
  }

  .run.stop {
    color: var(--danger-text);
  }

  .output {
    flex: 1;
    min-height: 0;
    margin: 0;
    padding: 8px 10px;
    border-radius: var(--radius-pre);
    background: var(--black-30);
    color: var(--text-secondary);
    font-family: ui-monospace, 'Cascadia Code', Consolas, monospace;
    font-size: var(--text-11);
    line-height: 1.45;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    overflow-y: auto;
    user-select: text;
  }

  .form {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .grow {
    flex: 1;
  }

  .mono {
    font-family: ui-monospace, 'Cascadia Code', Consolas, monospace;
  }

  .action:disabled {
    opacity: 0.5;
    cursor: default;
  }
</style>
