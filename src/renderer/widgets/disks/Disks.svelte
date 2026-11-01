<script lang="ts">
  // Espace libre des lecteurs : le premier en vedette, les autres en lignes compactes dessous.
  // En mode édition, une case à cocher par lecteur choisit ceux qui s'affichent.
  import type { Disk } from '../../../shared/api'
  import { pollWhileVisible } from '../../lib/poll.svelte'
  import RollingNumber from '../../lib/RollingNumber.svelte'
  import type { WidgetProps } from '../types'
  import type { DisksSettings } from './manifest'

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

  const GB = 1024 ** 3

  // Go entier comme l'Explorateur (1 Go = 1024³ octets) ; à partir de 1000 Go, des To à virgule.
  // Sous 1 Go (disque presque plein), des Mo plutôt qu'un « 0 Go » trompeur.
  function format(bytes: number): { value: string; unit: string } {
    if (bytes < GB) return { value: String(Math.floor(bytes / 1024 ** 2)), unit: 'Mo' }
    const go = Math.floor(bytes / GB)
    if (go < 1000) return { value: String(go), unit: 'Go' }
    return { value: (go / 1024).toFixed(1).replace('.', ','), unit: 'To' }
  }

  // Part utilisée (0 à 1) : la barre se remplit de ce qui est occupé.
  function usedShare(disk: Disk): number {
    return disk.total > 0 ? Math.min(1, Math.max(0, 1 - disk.free / disk.total)) : 0
  }

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
    save({ drives: next.length === present.length ? [] : next })
  }
</script>

{#snippet bar(share: number)}
  <div class="track" aria-hidden="true">
    <div class="fill" style:transform="scaleX({share})"></div>
  </div>
{/snippet}

<div class="widget">
  <span class="label">Disque</span>
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
    font-size: 12px;
    letter-spacing: 0.1em;
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
    font-weight: 300;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }

  .caption {
    font-size: 13px;
    color: var(--text-muted);
  }

  .caption.faint {
    color: var(--text-faint);
  }

  /* Remplissage par transform seulement : la piste fixe la largeur, scaleX la part utilisée. */
  .track {
    flex: none;
    height: 4px;
    border-radius: 4px;
    background: rgb(255 255 255 / 0.12);
  }

  .fill {
    height: 100%;
    border-radius: inherit;
    background: var(--accent);
    box-shadow: 0 0 10px var(--accent);
    transform-origin: left;
    transition: transform 400ms var(--ease-out);
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
    font-size: 13px;
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
    font-size: 13px;
    cursor: pointer;
  }

  .drives input {
    margin: 0;
    accent-color: var(--accent);
    cursor: inherit;
  }
</style>
