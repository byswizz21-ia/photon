<script lang="ts">
  // Widget de musique d'un service : réglages en mode édition, messages (chargement, connexion,
  // rien en cours), puis le design choisi : « Sobre » (lib/MusicPlayer.svelte, le même partout)
  // ou « Adapté » (propre au service, dans le dossier du widget). Case trop petite pour le design
  // adapté : design sobre aux couleurs du service.
  import ArrowSquareOutIcon from 'phosphor-svelte/lib/ArrowSquareOutIcon'
  import { untrack, type Component } from 'svelte'
  import { MUSIC_SERVICES, type MusicService, type MusicTrack } from '../../../shared/api'
  import type { WidgetProps } from '../../widgets/types'
  import MusicPlayer, { CUSTOM_MIN, type MusicSettings } from '../MusicPlayer.svelte'
  import { MusicSource } from './source.svelte'

  let {
    service,
    custom,
    settings,
    editing,
    save
  }: WidgetProps<MusicSettings> & {
    service: MusicService
    custom: Component<{ source: MusicSource; track: MusicTrack }>
  } = $props()

  // Le service d'un widget ne change jamais : lu une fois.
  const source = new MusicSource(
    untrack(() => service),
    () => settings.accent
  )
  const uid = $props.id() // un groupe de boutons radio par widget
  const name = $derived(MUSIC_SERVICES[service])
  const Custom = $derived(custom)
  const BRAND: Record<MusicService, [string, string]> = {
    spotify: ['var(--brand-spotify)', 'var(--ink)'],
    deezer: ['var(--brand-deezer)', 'var(--white)'],
    soundcloud: ['var(--brand-soundcloud)', 'var(--ink)'],
    ytmusic: ['var(--brand-ytmusic)', 'var(--white)']
  }
  const isCustom = $derived(settings.design === 'custom')
  let width = $state(0)
  let height = $state(0)
  const roomy = $derived(width >= CUSTOM_MIN.width && height >= CUSTOM_MIN.height)
  const DESIGNS = [
    ['sober', 'Sobre'],
    ['custom', 'Adapté']
  ] as const
</script>

{#snippet toggle(label: string, checked: boolean, change: (value: boolean) => void)}
  <label class="option" data-no-drag>
    <input type="checkbox" {checked} onchange={(event) => change(event.currentTarget.checked)} />
    <span>{label}</span>
  </label>
{/snippet}

{#if editing}
  <div class="box options">
    <span class="label">{name}</span>
    <fieldset class="seg" data-no-drag>
      <legend class="sr">Design</legend>
      {#each DESIGNS as [id, text] (id)}
        <label>
          <input
            type="radio"
            name="design-{uid}"
            value={id}
            checked={(settings.design === 'custom' ? 'custom' : 'sober') === id}
            onchange={() => save({ ...settings, design: id })}
          />
          <span>{text}</span>
        </label>
      {/each}
    </fieldset>
    {@render toggle(
      'Notification au changement de morceau (Photon caché)',
      settings.notify,
      (notify) => save({ ...settings, notify })
    )}
    {@render toggle(
      "Accent de l'app pris sur la pochette pendant la lecture",
      settings.accent,
      (accent) => save({ ...settings, accent })
    )}
  </div>
{:else if !source.music?.ready}
  <p class="box message">Chargement de {name}…</p>
{:else if !source.track}
  <!-- Sans compte, YT Music et SoundCloud jouent quand même : la connexion n'est proposée que si
       rien ne joue. Spotify : « connecté » veut dire app ouverte. -->
  <div class="box message">
    <p>
      {#if source.music.signedIn}Rien en cours
      {:else if service === 'spotify'}Spotify n'est pas ouvert.
      {:else}Connecte ton compte {service === 'ytmusic' ? 'Google' : name} une fois.{/if}
    </p>
    <button
      type="button"
      class="action"
      class:primary={!source.music.signedIn}
      onclick={() => source.open()}
    >
      {#if source.music.signedIn || service === 'spotify'}<ArrowSquareOutIcon
          size={16}
          aria-hidden="true"
        /> Ouvrir {name}
      {:else}Se connecter{/if}
    </button>
  </div>
{:else}
  <div
    class="fit"
    style:--accent={isCustom ? BRAND[service][0] : null}
    style:--on-accent={isCustom ? BRAND[service][1] : null}
    bind:clientWidth={width}
    bind:clientHeight={height}
  >
    {#if isCustom && roomy}
      <Custom {source} track={source.track} />
    {:else}
      <MusicPlayer {source} track={source.track} />
    {/if}
  </div>
{/if}

<style>
  .fit {
    height: 100%;
  }

  .box {
    box-sizing: border-box;
    height: 100%;
    margin: 0;
    padding: clamp(12px, 7cqmin, 20px);
  }

  .options {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .label {
    font-size: var(--text-12);
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
    color: var(--text-faint);
  }

  .option {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: var(--text-13);
    color: var(--text-muted);
    cursor: pointer;
  }

  .option input {
    accent-color: var(--accent);
  }

  /* Choix du design : deux pastilles (comme les réglages de Photon). */
  .seg {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 1fr;
    gap: 2px;
    max-width: 260px;
    margin: 0;
    padding: 3px;
    border: 1px solid var(--line);
    border-radius: var(--radius-pill);
    background: var(--white-4);
  }

  .seg label {
    position: relative;
    display: flex;
  }

  .seg input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    opacity: 0;
    cursor: pointer;
  }

  .seg span {
    flex: 1;
    display: grid;
    place-items: center;
    min-height: var(--control-h-chip);
    border-radius: var(--radius-pill);
    font-size: var(--text-13);
    font-weight: var(--weight-medium);
    color: var(--text-muted);
  }

  .seg input:not(:checked):hover + span {
    color: var(--text);
    background: var(--white-6);
  }

  .seg input:checked + span {
    background: var(--accent);
    color: var(--on-accent);
  }

  .seg input:focus-visible + span {
    outline: var(--focus-ring);
    outline-offset: var(--focus-offset);
  }

  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }

  .message {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    text-align: center;
    font-size: var(--text-13);
    color: var(--text-faint);
  }

  .message p {
    margin: 0;
  }
</style>
