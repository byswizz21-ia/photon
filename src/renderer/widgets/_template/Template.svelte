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
    font-size: var(--text-12);
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
    color: var(--text-faint);
  }

  .value {
    margin: 0;
    font-size: 24px;
    font-weight: var(--weight-light);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: var(--text-12);
    color: var(--text-muted);
  }

  .field input {
    min-height: 32px;
    padding: 0 10px;
    border: 1px solid var(--line);
    border-radius: var(--radius-input);
    background: var(--white-5);
    color: var(--text);
    font: inherit;
  }
</style>
