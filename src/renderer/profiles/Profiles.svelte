<script lang="ts">
  // Pastilles des profils dans l'en-tête : clic (ou Ctrl+1…9, App.svelte) pour basculer, « + »
  // pour en créer un (vierge, copie, modèle). En mode édition, le profil actif se renomme
  // et se supprime (2e clic pour confirmer, jamais le dernier).
  import PlusIcon from 'phosphor-svelte/lib/PlusIcon'
  import TrashIcon from 'phosphor-svelte/lib/TrashIcon'
  import { MAX_PROFILE_NAME } from '../../shared/model'
  import { TEMPLATES } from '../../shared/templates'
  import { app, changeProfile, saveProfile, switchProfile } from '../state.svelte'

  let menu = $state(false)
  let addBox = $state<HTMLElement>()
  let confirmDelete = $state(false)
  let askedAt = 0 // un double-clic ne doit pas valoir confirmation

  // Nouveau profil : mode édition pour le nommer et placer ses widgets.
  async function create(source: string): Promise<void> {
    menu = false
    if (await changeProfile(() => window.photon.createProfile(source))) app.editing = true
  }

  function remove(): void {
    if (!confirmDelete) {
      confirmDelete = true
      askedAt = Date.now()
      return
    }
    if (Date.now() - askedAt < 500) return
    confirmDelete = false
    void changeProfile(() => window.photon.deleteProfile())
  }

  const isActive = (id: string): boolean => id === app.settings.activeProfile
</script>

<!-- Clic ailleurs : le menu se ferme. -->
<svelte:window
  onpointerdown={(event) => {
    if (menu && !addBox?.contains(event.target as Node)) menu = false
  }}
/>

<div class="profiles">
  <div class="pills" role="group" aria-label="Profils">
    {#each app.profiles as profile, index (profile.id)}
      {#if app.editing && isActive(profile.id)}
        <input
          class="pill active"
          bind:value={app.profile.name}
          oninput={saveProfile}
          onblur={() => {
            if (app.profile.name.trim()) return
            app.profile.name = 'Sans nom'
            saveProfile()
          }}
          maxlength={MAX_PROFILE_NAME}
          size={Math.max(app.profile.name.length, 4)}
          spellcheck="false"
          aria-label="Nom du profil"
        />
        {#if app.profiles.length > 1}
          <button
            type="button"
            class="delete"
            class:confirm={confirmDelete}
            aria-label={confirmDelete ? 'Confirmer la suppression' : 'Supprimer ce profil'}
            title="Supprimer ce profil"
            onclick={remove}
            onblur={() => (confirmDelete = false)}
          >
            <TrashIcon size={15} aria-hidden="true" />
            {#if confirmDelete}Supprimer ?{/if}
          </button>
        {/if}
      {:else}
        <button
          type="button"
          class="pill"
          class:active={isActive(profile.id)}
          aria-pressed={isActive(profile.id)}
          title={index < 9 ? `Ctrl+${index + 1}` : undefined}
          onclick={() => switchProfile(profile.id)}
        >
          {isActive(profile.id) ? app.profile.name : profile.name}
        </button>
      {/if}
    {/each}
  </div>

  <div class="add" bind:this={addBox}>
    <button
      type="button"
      class="action icon small"
      aria-label="Nouveau profil"
      title="Nouveau profil"
      aria-haspopup="menu"
      aria-expanded={menu}
      onclick={() => (menu = !menu)}
    >
      <PlusIcon size={14} weight="bold" aria-hidden="true" />
    </button>
    {#if menu}
      <ul class="menu" role="menu">
        <li role="none">
          <button type="button" role="menuitem" onclick={() => create('blank')}>
            Profil vierge
          </button>
        </li>
        <li role="none">
          <button type="button" role="menuitem" onclick={() => create('duplicate')}>
            Dupliquer « {app.profile.name} »
          </button>
        </li>
        <li role="separator" class="label">Modèles</li>
        {#each Object.entries(TEMPLATES) as [id, template] (id)}
          <li role="none">
            <button type="button" role="menuitem" onclick={() => create(id)}>
              {template.name}
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>

<style>
  .profiles {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 6px;
    -webkit-app-region: no-drag;
  }

  /* Beaucoup de profils : les pastilles défilent, le « + » reste visible. */
  .pills {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 4px;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .pill {
    flex: none;
    height: 30px;
    padding: 0 12px;
    border: 1px solid transparent;
    border-radius: 999px;
    background: none;
    color: var(--text-muted);
    font: inherit;
    font-size: 13px;
    white-space: nowrap;
    cursor: pointer;
    transition: transform 300ms var(--ease-spring);
  }

  .pill:hover {
    color: var(--text);
    background: rgb(255 255 255 / 0.06);
  }

  .pill:active {
    transform: scale(0.96);
    transition-duration: 100ms;
  }

  .pill.active {
    border-color: color-mix(in srgb, var(--accent) 45%, transparent);
    background: color-mix(in srgb, var(--accent) 16%, transparent);
    color: var(--text);
  }

  input.pill {
    cursor: text;
    outline: 0;
    user-select: text;
  }

  input.pill:focus {
    border-color: var(--accent);
  }

  .delete {
    flex: none;
    height: 30px;
    min-width: 30px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 0 8px;
    border: 0;
    border-radius: 999px;
    background: none;
    color: var(--text-faint);
    font: inherit;
    font-size: 12px;
    cursor: pointer;
  }

  .delete:hover,
  .delete.confirm {
    color: #ff9aa8;
    background: rgb(255 77 94 / 0.12);
  }

  .add {
    position: relative;
    flex: none;
  }

  .action.small {
    min-height: 30px;
    width: 30px;
  }

  /* Les pastilles sont à gauche : le menu s'ouvre vers la droite. */
  .menu {
    left: 0;
    right: auto;
  }

  .label {
    padding: 8px 12px 4px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-faint);
  }

  button:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
</style>
