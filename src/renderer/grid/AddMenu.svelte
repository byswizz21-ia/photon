<script lang="ts">
  // Menu « Ajouter » du mode édition : un bouton par widget découvert dans widgets/.
  import PlusIcon from 'phosphor-svelte/lib/PlusIcon'
  import { widgets } from '../widgets/registry'
  import { addWidget } from './Grid.svelte'

  let open = $state(false)

  function pick(type: string): void {
    addWidget(type)
    open = false
  }
</script>

<div class="add">
  <button
    type="button"
    class="action"
    aria-haspopup="menu"
    aria-expanded={open}
    onclick={() => (open = !open)}
  >
    <PlusIcon size={16} weight="bold" aria-hidden="true" />
    Ajouter
  </button>
  {#if open}
    <ul class="menu" role="menu">
      {#each Object.entries(widgets) as [type, manifest] (type)}
        <li role="none">
          <button type="button" role="menuitem" onclick={() => pick(type)}>
            <manifest.icon size={20} weight="duotone" color="var(--accent)" aria-hidden="true" />
            {manifest.name}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .add {
    position: relative;
  }
</style>
