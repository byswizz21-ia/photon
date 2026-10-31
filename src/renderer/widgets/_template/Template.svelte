<script lang="ts">
  // Affichage du widget : reçoit ses réglages, le mode édition et de quoi sauvegarder ses réglages.
  import type { WidgetProps } from '../types'
  import type { TemplateSettings } from './manifest'

  let { settings, editing, save }: WidgetProps<TemplateSettings> = $props()
</script>

<div class="widget">
  <span class="label">Modèle</span>
  <p class="value">{settings.label}</p>
  {#if editing}
    <label class="field">
      Texte
      <input
        value={settings.label}
        oninput={(event) => save({ ...settings, label: event.currentTarget.value })}
      />
    </label>
  {/if}
</div>

<style>
  .widget {
    box-sizing: border-box;
    height: 100%;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .label {
    font-size: 12px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-faint);
  }

  .value {
    margin: 0;
    font-size: 24px;
    font-weight: 300;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 12px;
    color: var(--text-muted);
  }

  .field input {
    min-height: 32px;
    padding: 0 10px;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: rgb(255 255 255 / 0.05);
    color: var(--text);
    font: inherit;
  }
</style>
