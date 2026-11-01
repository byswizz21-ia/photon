<script lang="ts">
  // Règles de bascule automatique du profil actif (mode édition) : apps qui l'activent à leur
  // lancement, plage horaire. Appliquées seulement si l'option est active dans les réglages.
  import PlusIcon from 'phosphor-svelte/lib/PlusIcon'
  import XIcon from 'phosphor-svelte/lib/XIcon'
  import { app, saveProfile } from '../state.svelte'

  const DAYS = [
    [1, 'L', 'Lundi'],
    [2, 'M', 'Mardi'],
    [3, 'M', 'Mercredi'],
    [4, 'J', 'Jeudi'],
    [5, 'V', 'Vendredi'],
    [6, 'S', 'Samedi'],
    [0, 'D', 'Dimanche']
  ] as const
  const MAX_APPS = 20

  const auto = $derived(app.profile.auto)

  async function addApps(): Promise<void> {
    const names = await window.photon.pickAutoApps()
    auto.apps = [...new Set([...auto.apps, ...names])].slice(0, MAX_APPS)
    saveProfile()
  }

  function removeApp(name: string): void {
    auto.apps = auto.apps.filter((app) => app !== name)
    saveProfile()
  }

  function toggleHours(on: boolean): void {
    auto.hours = on ? { from: '09:00', to: '18:00', days: [1, 2, 3, 4, 5] } : null
    saveProfile()
  }

  function toggleDay(day: number): void {
    if (!auto.hours) return
    const days = auto.hours.days
    auto.hours.days = days.includes(day) ? days.filter((d) => d !== day) : [...days, day]
    saveProfile()
  }

  // Heure vidée dans le champ : on garde l'ancienne.
  function setTime(key: 'from' | 'to', value: string): void {
    if (!auto.hours || !value) return
    auto.hours[key] = value
    saveProfile()
  }
</script>

<div class="rules">
  <span class="label">Activer « {app.profile.name} » automatiquement</span>
  {#if !app.settings.autoProfiles}
    <small>À activer dans Réglages › Bascule automatique des profils</small>
  {/if}

  <span class="title">Quand je lance</span>
  {#each auto.apps as name (name)}
    <div class="app">
      <span>{name}</span>
      <button
        type="button"
        class="ghost"
        aria-label="Retirer {name}"
        onclick={() => removeApp(name)}
      >
        <XIcon size={12} weight="bold" aria-hidden="true" />
      </button>
    </div>
  {/each}
  {#if auto.apps.length < MAX_APPS}
    <button type="button" class="action small" onclick={addApps}>
      <PlusIcon size={14} weight="bold" aria-hidden="true" />
      Ajouter une app…
    </button>
  {/if}

  <label class="check">
    <input
      type="checkbox"
      checked={auto.hours !== null}
      onchange={(event) => toggleHours(event.currentTarget.checked)}
    />
    <span>Aux heures</span>
  </label>
  {#if auto.hours}
    <div class="hours">
      <input
        type="time"
        value={auto.hours.from}
        aria-label="Début"
        onchange={(event) => setTime('from', event.currentTarget.value)}
      />
      <span>à</span>
      <input
        type="time"
        value={auto.hours.to}
        aria-label="Fin"
        onchange={(event) => setTime('to', event.currentTarget.value)}
      />
    </div>
    <div class="days" role="group" aria-label="Jours">
      {#each DAYS as [day, letter, name] (day)}
        <button
          type="button"
          class:on={auto.hours.days.includes(day)}
          aria-pressed={auto.hours.days.includes(day)}
          aria-label={name}
          title={name}
          onclick={() => toggleDay(day)}
        >
          {letter}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  /* Popover de verre façon menu (Photon Design System : glass/Menu). */
  .rules {
    position: absolute;
    left: 0;
    top: calc(100% + 8px);
    z-index: 10;
    box-sizing: border-box;
    width: 280px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px;
    border-radius: var(--radius-menu);
    background: var(--glass-sheen), var(--menu-bg);
    backdrop-filter: var(--glass-filter-menu);
    border: 1px solid var(--glass-edge);
    box-shadow: var(--shadow-menu);
    font-size: var(--text-13);
  }

  .label {
    font-size: var(--text-11);
    text-transform: uppercase;
    letter-spacing: var(--tracking-menu-label);
    color: var(--text-faint);
  }

  /* Indice : faible, il dit où aller (› sépare les étapes). */
  small {
    font-size: var(--text-12);
    color: var(--text-faint);
  }

  .title {
    margin-top: 4px;
    color: var(--text-muted);
  }

  /* Case native teintée par l'accent (Checkbox). */
  .check {
    display: grid;
    grid-template-columns: 18px 1fr;
    align-items: center;
    gap: 10px;
    margin-top: 4px;
    color: var(--text-muted);
    cursor: pointer;
  }

  .check input {
    margin: 0;
    accent-color: var(--accent);
    cursor: inherit;
  }

  .app {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-height: 36px;
    padding: 0 4px 0 12px;
    border-radius: var(--radius-row);
    background: var(--white-5);
  }

  .app span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Bouton rond discret (IconButton ghost). */
  .ghost {
    flex: none;
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: none;
    color: var(--text-muted);
    cursor: pointer;
    transition: transform var(--dur-spring) var(--ease-spring);
  }

  .ghost:hover {
    color: var(--text);
    background: var(--white-8);
  }

  .ghost:active {
    transform: scale(0.9);
    transition-duration: var(--dur-press);
  }

  .action.small {
    align-self: flex-start;
    min-height: var(--control-h-pill);
  }

  .hours {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-faint);
  }

  /* Champ de widget (TextField). */
  .hours input {
    flex: 1;
    min-width: 0;
    box-sizing: border-box;
    min-height: var(--control-h-input);
    padding: 0 10px;
    border: 1px solid var(--line);
    border-radius: var(--radius-input);
    background: var(--white-5);
    color: var(--text);
    font: inherit;
    font-size: var(--text-13);
    outline: 0;
    color-scheme: dark;
  }

  .hours input:focus {
    border-color: var(--border-focus);
  }

  /* Jours : pastilles rondes ; choisi = accent 16 % + bord accent 45 %. */
  .days {
    display: flex;
    gap: 4px;
  }

  .days button {
    flex: 1;
    height: var(--control-h-chip);
    padding: 0;
    border: 1px solid var(--line);
    border-radius: var(--radius-pill);
    background: var(--white-4);
    color: var(--text-muted);
    font: inherit;
    font-size: var(--text-12);
    cursor: pointer;
    transition: transform var(--dur-spring) var(--ease-spring);
  }

  .days button:hover {
    color: var(--text);
    background: var(--white-8);
  }

  .days button:active {
    transform: scale(0.95);
    transition-duration: var(--dur-press);
  }

  .days button.on {
    border-color: var(--border-accent-soft);
    background: var(--surface-accent-soft);
    color: var(--text);
  }
</style>
