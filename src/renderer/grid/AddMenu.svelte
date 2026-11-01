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

  .menu {
    position: absolute;
    right: 0;
    top: calc(100% + 8px);
    z-index: 10;
    min-width: 200px;
    margin: 0;
    padding: 6px;
    list-style: none;
    border-radius: 14px;
    background: var(--glass-sheen), rgb(20 22 29 / 0.6);
    backdrop-filter: blur(24px) saturate(1.7);
    border: 1px solid var(--glass-edge);
    box-shadow:
      var(--glass-rim),
      0 16px 40px -16px rgb(0 0 0 / 0.6);
  }

  .menu button {
    width: 100%;
    min-height: 40px;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 12px;
    border: 0;
    border-radius: 10px;
    background: transparent;
    text-align: left;
    cursor: pointer;
  }

  .menu button:hover,
  .menu button:focus-visible {
    background: rgb(255 255 255 / 0.06);
  }
</style>
