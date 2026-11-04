<script lang="ts">
  // Espace libre des lecteurs : le premier en vedette, les autres en lignes compactes dessous.
  // En mode édition : design, seuil (design « Exécution »), une case par lecteur affiché.
  import type { Disk } from '../../../shared/api'
  import DesignPicker from '../../lib/DesignPicker.svelte'
  import { pollWhileVisible } from '../../lib/poll.svelte'
  import RollingNumber from '../../lib/RollingNumber.svelte'
  import type { WidgetProps } from '../types'
  import { format, threshold, THRESHOLD, usedShare } from './disk'
  import DisksExecute from './DisksExecute.svelte'
  import { DISK_DESIGNS, type DisksSettings } from './manifest'

  let { settings, editing, save }: WidgetProps<DisksSettings> = $props()

  // undefined = avant la 1re lecture ; [] = liste vide ou lecture en échec.
  let disks = $state.raw<Disk[]>()

  pollWhileVisible(async () => {
    try {
      disks = await window.photon.disks()
    } catch (error) {
      disks = []
      throw error // pollWhileVisible l'écrit dans la console
    }
  }, 10_000)

  const present = $derived(disks ?? [])
  // Lecteurs affichés : ceux du réglage, tous s'il est vide. Le premier est en vedette.
  const selected = $derived(
    settings.drives.length === 0
      ? present
      : present.filter((disk) => settings.drives.includes(disk.mount))
  )
  const featured = $derived(selected[0])
  const others = $derived(selected.slice(1))

  const limit = $derived(threshold(settings.threshold))

  // Chargement : tiret et barre vide. Lecteur choisi débranché, liste vide ou erreur : message discret.
  const view = $derived.by(() => {
    if (!featured) {
      const caption = !disks ? '' : present.length > 0 ? 'Lecteur absent' : 'Lecture impossible'
      return { value: '—', caption, used: 0 }
    }
    const { value, unit } = format(featured.free)
    return { value, caption: `${unit} libres sur ${featured.mount}`, used: usedShare(featured) }
  })

  // Tout décocher reviendrait à « tous » : le dernier lecteur coché ne peut pas être décoché.
  function toggle(mount: string, on: boolean): void {
    const next = selected.map((disk) => disk.mount).filter((m) => m !== mount)
    if (on) next.push(mount)
    save({ ...settings, drives: next.length === present.length ? [] : next })
  }
</script>

{#snippet bar(share: number)}
  <div class="track" aria-hidden="true">
    <div class="fill" style:transform="scaleX({share})"></div>
  </div>
{/snippet}

{#if !editing && settings.design === 'execute'}
  <DisksExecute disks={selected} loaded={disks !== undefined} {limit} />
{:else}
  <div class="widget">
    {#if editing}
      <DesignPicker
        designs={DISK_DESIGNS}
        value={settings.design}
        onpick={(design) => save({ ...settings, design })}
      />
      {#if settings.design === 'execute'}
        <label class="limit" data-no-drag>
          <span>Seuil d'exécution : {limit} %</span>
          <input
            type="range"
            min={THRESHOLD.min}
            max={THRESHOLD.max}
            step={THRESHOLD.step}
            value={limit}
            oninput={(event) => save({ ...settings, threshold: event.currentTarget.valueAsNumber })}
          />
        </label>
      {/if}
    {:else}
      <span class="label">Disque</span>
    {/if}
    {#if editing && present.length > 0}
      <!-- data-no-drag : gridstack ne déplace pas la carte quand on appuie sur une case -->
      <div class="drives" role="group" aria-label="Lecteurs affichés" data-no-drag>
        {#each present as disk (disk.mount)}
          {@const on = selected.includes(disk)}
          <label>
            <input
              type="checkbox"
              checked={on}
              disabled={on && selected.length === 1}
              onchange={(event) => toggle(disk.mount, event.currentTarget.checked)}
            />
            {disk.mount}
          </label>
        {/each}
      </div>
    {:else}
      <div class="main">
        <span class="value"><RollingNumber value={view.value} /></span>
        <span class="caption" class:faint={!featured}>{view.caption}</span>
      </div>
      {@render bar(view.used)}
      {#if others.length > 0}
        <ul class="others">
          {#each others as disk (disk.mount)}
            {@const free = format(disk.free)}
            <li class="row">
              <span class="letter">{disk.mount}</span>
              <span class="free"><RollingNumber value={free.value} /> {free.unit}</span>
              {@render bar(usedShare(disk))}
            </li>
          {/each}
        </ul>
      {/if}
    {/if}
  </div>
{/if}

<style>
  .widget {
    box-sizing: border-box;
    height: 100%;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: clamp(8px, 7cqh, 14px);
  }

  .label {
    font-size: var(--text-12);
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
    color: var(--text-faint);
  }

  /* Chiffre et légende sur la même ligne de base ; la légende passe dessous si la carte est étroite. */
  .main {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    column-gap: 8px;
    row-gap: 2px;
  }

  /* 32 px sur la carte 3×2 par défaut ; suit la largeur et la hauteur de la carte. */
  .value {
    font-size: clamp(18px, min(11.2cqw, 22cqh), 40px);
    font-weight: var(--weight-light);
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }

  .caption {
    font-size: var(--text-13);
    color: var(--text-muted);
  }

  .caption.faint {
    color: var(--text-faint);
  }

  /* Remplissage par transform seulement : la piste fixe la largeur, scaleX la part utilisée. */
  .track {
    flex: none;
    height: 4px;
    border-radius: var(--radius-bar);
    background: var(--white-12);
  }

  .fill {
    height: 100%;
    border-radius: inherit;
    background: var(--accent);
    box-shadow: var(--glow-bar);
    transform-origin: left;
    transition: transform var(--dur-fill) var(--ease-out);
  }

  /* Autres lecteurs : seulement si la carte est assez large et assez haute pour au moins une ligne. */
  .others {
    flex: 1 1 0;
    min-height: 0;
    /* Marge négative = marge intérieure : la disposition ne bouge pas, le halo n'est pas rogné. */
    margin: -6px -10px;
    padding: 6px 10px;
    list-style: none;
    display: none;
    /* Les lignes qui ne tiennent pas passent dans une 2e colonne, rognée : jamais de ligne coupée. */
    flex-flow: column wrap;
    gap: 6px 24px;
    overflow: hidden;
  }

  @container (min-width: 150px) and (min-height: 160px) {
    .others {
      display: flex;
    }
  }

  .row {
    flex: none;
    width: 100%;
    display: grid;
    grid-template-columns: 1.5em 3.6em 1fr;
    align-items: center;
    column-gap: 8px;
    font-size: var(--text-13);
    line-height: 16px;
  }

  .letter {
    color: var(--text-muted);
  }

  .free {
    text-align: right;
    white-space: nowrap;
  }

  .row .track {
    height: 3px;
  }

  .drives {
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    gap: 4px 12px;
  }

  .drives label {
    min-height: 24px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: var(--text-13);
    cursor: pointer;
  }

  .limit {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: var(--text-12);
    color: var(--text-muted);
  }

  .limit input {
    margin: 0;
    accent-color: var(--accent);
  }

  .drives input {
    margin: 0;
    accent-color: var(--accent);
    cursor: inherit;
  }
</style>
