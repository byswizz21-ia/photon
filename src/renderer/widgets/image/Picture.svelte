<script lang="ts">
  // Image décorative : lib/MediaCard.svelte, réglages { image, fit } de ce widget. Titre en option,
  // posé en bas sur un dégradé (splash) ; ses trois champs s'éditent en mode édition.
  import MediaCard from '../../lib/MediaCard.svelte'
  import type { WidgetProps } from '../types'
  import type { ImageSettings } from './manifest'

  let { settings, editing, save }: WidgetProps<ImageSettings> = $props()

  const FIELDS = [
    ['kicker', 'Surtitre', 'Top · Zaun'],
    ['title', 'Titre', 'Urgot'],
    ['subtitle', 'Sous-titre', 'le Cuirassé']
  ] as const
  const captioned = $derived(Boolean(settings.kicker || settings.title || settings.subtitle))
</script>

<div class="picture">
  <MediaCard
    kind="image"
    file={settings.image}
    fit={settings.fit}
    {editing}
    change={({ file, ...patch }) =>
      save({ ...settings, ...patch, ...(file === undefined ? {} : { image: file }) })}
  />
  {#if editing}
    <div class="fields" data-no-drag>
      {#each FIELDS as [key, label, example] (key)}
        <label class="w-field">
          {label}
          <input
            class="w-input"
            value={settings[key]}
            placeholder={example}
            maxlength="60"
            oninput={(event) => save({ ...settings, [key]: event.currentTarget.value })}
          />
        </label>
      {/each}
    </div>
  {:else if captioned}
    <div class="caption">
      {#if settings.kicker}<span class="kicker">{settings.kicker}</span>{/if}
      {#if settings.title}<span class="title">{settings.title}</span>{/if}
      {#if settings.subtitle}<span class="subtitle">{settings.subtitle}</span>{/if}
    </div>
  {/if}
</div>

<style>
  .picture {
    position: relative;
    height: 100%;
    border-radius: inherit;
    overflow: hidden;
  }

  /* Titre par-dessus l'image : ne gêne ni le glisser-déposer ni les clics. */
  .caption,
  .fields {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    padding: clamp(14px, 6cqmin, 24px);
    display: flex;
    flex-direction: column;
    gap: 4px;
    background: linear-gradient(180deg, transparent, var(--veil-deep));
  }

  .caption {
    pointer-events: none;
  }

  /* En haut : les boutons de l'image (Changer, Entière) sont en bas. Carte trop petite : masqués. */
  .fields {
    top: 0;
    bottom: auto;
    gap: 6px;
    background: linear-gradient(0deg, transparent, var(--veil-deep));
  }

  @container (max-height: 300px) {
    .fields {
      display: none;
    }
  }

  .kicker {
    font-size: var(--text-12);
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
    color: var(--accent);
  }

  .title {
    font-size: clamp(24px, 11cqw, 44px);
    font-weight: var(--weight-semibold);
    letter-spacing: var(--tracking-title);
    line-height: 1;
    text-transform: uppercase;
    overflow-wrap: anywhere;
  }

  .subtitle {
    font-size: var(--text-13);
    color: var(--text-muted);
  }
</style>
