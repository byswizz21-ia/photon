<script lang="ts">
  // Une note par carte, tirée du carnet commun à tous les profils (notebook.ts). En-tête : titre,
  // copier, carnet. Le carnet liste toutes les notes : en ouvrir une, en créer, en supprimer
  // (2e clic). Entrée continue les listes à puces. Enregistré peu après la dernière frappe.
  import ArrowLeftIcon from 'phosphor-svelte/lib/ArrowLeftIcon'
  import CheckIcon from 'phosphor-svelte/lib/CheckIcon'
  import CopyIcon from 'phosphor-svelte/lib/CopyIcon'
  import NotebookIcon from 'phosphor-svelte/lib/NotebookIcon'
  import PlusIcon from 'phosphor-svelte/lib/PlusIcon'
  import TrashIcon from 'phosphor-svelte/lib/TrashIcon'
  import DesignPicker from '../../lib/DesignPicker.svelte'
  import { profileKey, shared } from '../../lib/shared.svelte'
  import { dayLabel, timeLabel } from '../../lib/when'
  import { simple } from '../catalog'
  import type { WidgetProps } from '../types'
  import { NOTE_FONTS, NOTE_SIZES, type NotesSettings } from './manifest'
  import {
    BUDGET,
    continueList,
    MAX_CHARS,
    MAX_NOTES,
    MAX_TITLE,
    noteName,
    parseNotebook,
    usedChars,
    wordCount,
    type Note
  } from './notebook'

  let { settings, editing, save, preview }: WidgetProps<NotesSettings> = $props()

  const book = shared('notes', parseNotebook)
  // Ancienne note « propre au profil » : reprise dans le carnet à la première ouverture.
  const legacy = $derived(
    settings.own && !settings.note ? shared(profileKey('notes', true), parseNotebook) : null
  )

  const note = $derived(book.value.notes.find((n) => n.id === settings.note))
  const used = $derived(usedChars(book.value))
  const full = $derived(book.value.notes.length >= MAX_NOTES || used >= BUDGET)
  // Place laissée à cette note : le carnet entier tient dans un fichier.
  const room = $derived(Math.min(MAX_CHARS, BUDGET - used + (note?.text.length ?? 0)))

  function create(text = ''): string | null {
    if (full) return null
    const id = crypto.randomUUID()
    book.value.notes.unshift({ id, title: '', text, updated: Date.now() })
    book.save()
    return id
  }

  function open(id: string): void {
    browsing = false
    query = ''
    if (id !== settings.note) save({ ...settings, note: id, own: false })
  }

  // Carte sans note (nouvelle, ou sa note supprimée) : elle s'en crée une.
  $effect(() => {
    if (preview || !book.ready || note || (legacy && !legacy.ready)) return
    const id = create(legacy?.value.notes[0]?.text)
    if (id) open(id)
  })

  function touch(): void {
    if (!note) return
    note.updated = Date.now()
    book.save()
  }

  let area: HTMLTextAreaElement | undefined = $state()

  function onkeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing || !area) return
    if (area.selectionStart !== area.selectionEnd) return
    const edit = continueList(area.value, area.selectionStart)
    if (!edit) return
    event.preventDefault()
    area.setSelectionRange(edit.from, edit.to)
    // Passe par l'éditeur du navigateur : Ctrl+Z annule la puce, input suit comme une frappe.
    document.execCommand(edit.insert ? 'insertText' : 'delete', false, edit.insert)
  }

  let copied = $state(false)
  let copyTimer: ReturnType<typeof setTimeout> | undefined

  function copy(): void {
    if (!note?.text) return
    window.photon.copyText(note.text)
    copied = true
    clearTimeout(copyTimer)
    copyTimer = setTimeout(() => (copied = false), 1500)
  }

  // Carnet : notes non vides (et celle de la carte), la plus récente en haut.
  let browsing = $state(false)
  let query = $state('')
  const listed = $derived(
    book.value.notes
      .filter((n) => n.id === settings.note || n.text.trim() || n.title.trim())
      .filter((n) => simple(`${n.title} ${n.text}`).includes(simple(query.trim())))
      .sort((a, b) => b.updated - a.updated)
  )

  let confirming = $state<string | null>(null)
  let confirmTimer: ReturnType<typeof setTimeout> | undefined

  // Supprimer est définitif : 2e clic dans les 4 s.
  function remove(id: string): void {
    clearTimeout(confirmTimer)
    if (confirming !== id) {
      confirming = id
      confirmTimer = setTimeout(() => (confirming = null), 4000)
      return
    }
    confirming = null
    book.value.notes = book.value.notes.filter((n) => n.id !== id)
    book.save()
  }

  function createAndOpen(): void {
    const id = create()
    if (id) open(id)
  }

  const modified = (n: Note): string =>
    n.updated ? `${dayLabel(n.updated, new Date())} à ${timeLabel(n.updated)}` : ''
  const plural = (count: number, word: string): string => `${count} ${word}${count > 1 ? 's' : ''}`
</script>

{#if editing}
  <div class="options">
    <span class="w-label">Taille du texte</span>
    <DesignPicker
      designs={NOTE_SIZES}
      value={settings.size}
      label="Taille du texte"
      onpick={(size) => save({ ...settings, size })}
    />
    <span class="w-label">Police</span>
    <DesignPicker
      designs={NOTE_FONTS}
      value={settings.font}
      label="Police"
      onpick={(font) => save({ ...settings, font })}
    />
    <label class="field" data-no-drag>
      <input
        type="checkbox"
        checked={settings.footer}
        onchange={(event) => save({ ...settings, footer: event.currentTarget.checked })}
      />
      <span>Mots et date en bas</span>
    </label>
    <label class="field" data-no-drag>
      <input
        type="checkbox"
        checked={settings.spell}
        onchange={(event) => save({ ...settings, spell: event.currentTarget.checked })}
      />
      <span>Correcteur orthographique</span>
    </label>
  </div>
{:else if browsing}
  <div class="w-body" data-no-press>
    <div class="head">
      <button
        type="button"
        class="icon"
        aria-label="Revenir à la note"
        onclick={() => (browsing = false)}
      >
        <ArrowLeftIcon size={16} aria-hidden="true" />
      </button>
      <span class="w-label grow">Carnet · {plural(listed.length, 'note')}</span>
      <button
        type="button"
        class="icon"
        aria-label="Nouvelle note"
        title="Nouvelle note"
        disabled={full}
        onclick={createAndOpen}
      >
        <PlusIcon size={16} aria-hidden="true" />
      </button>
    </div>
    {#if book.value.notes.length > 5}
      <input
        class="w-input"
        type="search"
        placeholder="Chercher"
        aria-label="Chercher une note"
        bind:value={query}
      />
    {/if}
    <ul class="w-list">
      {#each listed as n (n.id)}
        <li class:current={n.id === settings.note}>
          <button type="button" class="pick" onclick={() => open(n.id)}>
            <span class="name">{noteName(n)}</span>
            <span class="sub"
              >{[modified(n), plural(wordCount(n.text), 'mot')].filter(Boolean).join(' · ')}</span
            >
          </button>
          <button
            type="button"
            class="icon"
            class:danger={confirming === n.id}
            aria-label={confirming === n.id
              ? `Confirmer la suppression de ${noteName(n)}`
              : `Supprimer ${noteName(n)}`}
            title={confirming === n.id ? 'Cliquer encore pour supprimer' : 'Supprimer'}
            onclick={() => remove(n.id)}
          >
            <TrashIcon size={14} aria-hidden="true" />
          </button>
        </li>
      {:else}
        <li class="w-message">Aucune note trouvée.</li>
      {/each}
    </ul>
    {#if full}<p class="w-hint">Carnet plein : supprime une note pour en créer une.</p>{/if}
  </div>
{:else}
  <div class="w-body" data-no-press>
    <div class="head">
      {#if note}
        <input
          class="title"
          bind:value={note.title}
          oninput={touch}
          maxlength={MAX_TITLE}
          placeholder={noteName({ ...note, title: '' })}
          aria-label="Titre de la note"
        />
      {:else}
        <span class="w-label grow">Notes</span>
      {/if}
      <button
        type="button"
        class="icon"
        aria-label={copied ? 'Copié' : 'Copier la note'}
        title="Copier"
        disabled={!note?.text}
        onclick={copy}
      >
        {#if copied}<CheckIcon size={16} aria-hidden="true" />{:else}<CopyIcon
            size={16}
            aria-hidden="true"
          />{/if}
      </button>
      <button
        type="button"
        class="icon"
        aria-label="Carnet : toutes les notes"
        title="Carnet"
        disabled={preview}
        onclick={() => (browsing = true)}
      >
        <NotebookIcon size={16} aria-hidden="true" />
      </button>
    </div>
    {#if note}
      <textarea
        bind:this={area}
        bind:value={note.text}
        oninput={touch}
        {onkeydown}
        class="text {settings.size} {settings.font}"
        maxlength={room}
        spellcheck={settings.spell}
        placeholder="Une idée, un numéro, une liste…"
        aria-label={noteName(note)}></textarea>
      {#if settings.footer}
        <p class="w-hint foot">
          <span>{plural(wordCount(note.text), 'mot')}</span>
          {#if note.updated}<span>Modifiée {modified(note)}</span>{/if}
        </p>
      {/if}
    {:else}
      <p class="w-message">
        {preview
          ? 'Une note par carte, toutes rangées dans le carnet.'
          : full
            ? 'Carnet plein : supprime une note.'
            : ''}
      </p>
    {/if}
  </div>
{/if}

<style>
  .options {
    box-sizing: border-box;
    padding: clamp(10px, 6cqmin, 20px);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .field {
    align-self: flex-start;
    max-width: 100%;
    min-height: 24px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: var(--text-13);
    color: var(--text-muted);
    cursor: pointer;
  }

  .field input {
    flex: none;
    width: 16px;
    height: 16px;
    margin: 0;
    accent-color: var(--accent);
    cursor: pointer;
  }

  .head {
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
  }

  .grow {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .title {
    flex: 1;
    min-width: 0;
    padding: 0;
    border: 0;
    outline: 0;
    background: none;
    color: var(--text);
    font: inherit;
    font-size: var(--text-13);
    font-weight: var(--weight-semibold);
    letter-spacing: var(--tracking-title);
    text-overflow: ellipsis;
  }

  .title::placeholder {
    color: var(--text-faint);
  }

  .icon {
    flex: none;
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
    padding: 0;
    border: 0;
    border-radius: var(--radius-pill);
    background: transparent;
    color: var(--text-faint);
    cursor: pointer;
    transition: transform var(--dur-spring) var(--ease-spring);
  }

  .icon:hover:not(:disabled) {
    color: var(--text);
    background: var(--surface-hover);
  }

  .icon:active:not(:disabled) {
    transform: scale(0.85);
    transition-duration: var(--dur-press);
  }

  .icon:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .icon.danger {
    color: var(--danger-text);
    background: var(--danger-surface);
  }

  .text {
    flex: 1;
    min-height: 0;
    padding: 0;
    border: 0;
    outline: 0;
    resize: none;
    background: none;
    color: var(--text);
    font: inherit;
    font-size: var(--text-14);
    line-height: 1.5;
    user-select: text;
  }

  .text::placeholder {
    color: var(--text-faint);
  }

  .text.s {
    font-size: var(--text-13);
  }

  .text.l {
    font-size: var(--text-16);
  }

  .text.serif {
    font-family: var(--font-serif);
  }

  .text.mono {
    font-family: var(--font-mono);
    line-height: 1.45;
  }

  .foot {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    white-space: nowrap;
    overflow: hidden;
  }

  li {
    display: flex;
    align-items: center;
    gap: 4px;
    border-radius: var(--radius-menu-item);
  }

  li:hover,
  li.current {
    background: var(--surface-hover);
  }

  li.current .name {
    color: var(--accent);
  }

  .pick {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 6px 8px;
    border: 0;
    background: none;
    color: var(--text);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .name,
  .sub {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .name {
    font-size: var(--text-13);
    font-weight: var(--weight-medium);
  }

  .sub {
    font-size: var(--text-11);
    color: var(--text-faint);
  }
</style>
