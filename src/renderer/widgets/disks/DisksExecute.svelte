<script lang="ts">
  // Design « Exécution » (thème Urgot) : espace libre en barre de vie, trait au seuil. Sous le
  // seuil, la barre passe au rouge et le disque est « Exécutable ».
  import type { Disk } from '../../../shared/api'
  import RollingNumber from '../../lib/RollingNumber.svelte'
  import { executable, format, freeShare } from './disk'

  let { disks, loaded, limit }: { disks: Disk[]; loaded: boolean; limit: number } = $props()

  const featured = $derived(disks[0])
  const big = $derived(featured ? format(featured.free) : null)
</script>

<div class="w-body widget">
  <div class="w-head">
    <span class="w-label title"><kbd class="w-kbd">R</kbd>Disque</span>
    <span class="limit">Seuil {limit} %</span>
  </div>
  <div class="main">
    <span class="value"><RollingNumber value={big?.value ?? '—'} /></span>
    <span class="caption">
      {#if featured && big}{big.unit} libres sur {featured.mount}{:else if loaded}Lecture impossible{/if}
    </span>
  </div>
  <ul class="disks">
    {#each disks as disk (disk.mount)}
      {@const free = format(disk.free)}
      {@const share = freeShare(disk)}
      {@const low = executable(disk, limit)}
      <li class:low>
        <span class="letter">{disk.mount}</span>
        <span class="free">{free.value} {free.unit}</span>
        <span class="track" aria-hidden="true">
          <span class="fill" style:transform="scaleX({share})"></span>
          <span class="mark" style:left="{limit}%"></span>
        </span>
        <span class="tag">{low ? 'Exécutable' : `${Math.round(share * 100)} %`}</span>
      </li>
    {/each}
  </ul>
</div>

<style>
  .widget {
    padding: 24px;
    gap: clamp(8px, 7cqh, 14px);
  }

  .title {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .limit {
    font-size: var(--text-12);
    color: var(--text-faint);
    white-space: nowrap;
  }

  .main {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    column-gap: 8px;
    row-gap: 2px;
  }

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

  /* Lignes qui ne tiennent pas : passées dans une 2e colonne, rognée (jamais de ligne coupée).
     Marge négative = marge intérieure : le halo des barres n'est pas rogné. */
  .disks {
    flex: 1 1 0;
    min-height: 0;
    margin: -6px -10px;
    padding: 6px 10px;
    list-style: none;
    display: flex;
    flex-flow: column wrap;
    gap: 6px 24px;
    overflow: hidden;
  }

  li {
    flex: none;
    width: 100%;
    display: grid;
    grid-template-columns: 1.5em 3.6em minmax(0, 1fr);
    align-items: center;
    column-gap: 8px;
    row-gap: 3px;
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

  /* Barre de vie : la piste fixe la largeur, scaleX la part libre. */
  .track {
    position: relative;
    height: 6px;
    border-radius: var(--radius-bar);
    background: var(--white-12);
  }

  .fill {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: var(--accent);
    box-shadow: 0 0 10px var(--accent);
    transform-origin: left;
    transition: transform var(--dur-fill) var(--ease-out);
  }

  .low .fill {
    background: var(--danger);
    box-shadow: 0 0 10px var(--danger);
  }

  /* Trait au seuil d'exécution. */
  .mark {
    position: absolute;
    top: -3px;
    bottom: -3px;
    width: 2px;
    border-radius: 1px;
    background: var(--text);
    opacity: 0.7;
  }

  .tag {
    grid-column: 3;
    font-size: var(--text-11);
    line-height: 14px;
    font-weight: var(--weight-semibold);
    color: var(--text-faint);
  }

  .low .tag {
    color: var(--danger-text);
  }
</style>
