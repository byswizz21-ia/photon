<script lang="ts">
  // Règles de bascule automatique du profil actif (mode édition) : apps qui l'activent à leur
  // lancement, plage horaire. Appliquées seulement si l'option est active dans les réglages.
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
    <small>Désactivé : à allumer dans les réglages (bascule automatique des profils)</small>
  {/if}

  <span class="title">Quand je lance</span>
  {#each auto.apps as name (name)}
    <div class="app">
      <span>{name}</span>
      <button type="button" aria-label="Retirer {name}" onclick={() => removeApp(name)}>
        <XIcon size={12} aria-hidden="true" />
      </button>
    </div>
  {/each}
  {#if auto.apps.length < MAX_APPS}
    <button type="button" class="add" onclick={addApps}>Ajouter une app…</button>
  {/if}

  <label class="title check">
    <input
      type="checkbox"
      checked={auto.hours !== null}
      onchange={(event) => toggleHours(event.currentTarget.checked)}
    />
    Aux heures
  </label>
  {#if auto.hours}
    <div class="hours">
      <input
        type="time"
        value={auto.hours.from}
        aria-label="Début"
        onchange={(event) => setTime('from', event.currentTarget.value)}
      />
      →
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
  .rules {
    position: absolute;
    left: 0;
    top: calc(100% + 8px);
    z-index: 10;
    width: 260px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 14px;
    border-radius: 14px;
    background: var(--glass-sheen), rgb(20 22 29 / 0.6);
    backdrop-filter: blur(24px) saturate(1.7);
    border: 1px solid var(--glass-edge);
    box-shadow: var(--glass-rim);
    font-size: 13px;
  }

  .label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-faint);
  }

  small {
    font-size: 12px;
    color: #ffb86b;
  }

  .title {
    margin-top: 4px;
    color: var(--text-muted);
  }

  .check {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }

  .app {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 4px 4px 4px 10px;
    border-radius: 8px;
    background: rgb(255 255 255 / 0.06);
  }

  .app span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  button {
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }

  .app button {
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    border-radius: 6px;
    color: var(--text-faint);
  }

  .app button:hover {
    color: var(--text);
    background: rgb(255 255 255 / 0.08);
  }

  .add {
    align-self: flex-start;
    padding: 4px 0;
    color: var(--accent);
  }

  .hours {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-faint);
  }

  .hours input {
    flex: 1;
    min-width: 0;
    padding: 6px 8px;
    border: 1px solid var(--glass-edge);
    border-radius: 8px;
    background: rgb(255 255 255 / 0.06);
    color: var(--text);
    font: inherit;
    color-scheme: dark;
  }

  .days {
    display: flex;
    gap: 4px;
  }

  .days button {
    flex: 1;
    height: 28px;
    border-radius: 8px;
    color: var(--text-faint);
    background: rgb(255 255 255 / 0.04);
  }

  .days button.on {
    color: var(--text);
    background: color-mix(in srgb, var(--accent) 24%, transparent);
  }

  button:focus-visible,
  input:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
</style>
