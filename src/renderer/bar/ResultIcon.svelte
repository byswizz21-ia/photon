<script lang="ts">
  // Icône d'un résultat : celle de Windows pour une app, un fichier ou un dossier, sinon un pictogramme.
  import AppWindowIcon from 'phosphor-svelte/lib/AppWindowIcon'
  import CalculatorIcon from 'phosphor-svelte/lib/CalculatorIcon'
  import CommandIcon from 'phosphor-svelte/lib/CommandIcon'
  import FileIcon from 'phosphor-svelte/lib/FileIcon'
  import FolderIcon from 'phosphor-svelte/lib/FolderIcon'
  import GlobeIcon from 'phosphor-svelte/lib/GlobeIcon'
  import MagnifyingGlassIcon from 'phosphor-svelte/lib/MagnifyingGlassIcon'
  import SlidersHorizontalIcon from 'phosphor-svelte/lib/SlidersHorizontalIcon'
  import SparkleIcon from 'phosphor-svelte/lib/SparkleIcon'
  import type { SearchResult } from '../../shared/api'

  let { result }: { result: SearchResult } = $props()

  const ICONS = {
    app: AppWindowIcon,
    file: FileIcon,
    folder: FolderIcon,
    site: GlobeIcon,
    web: MagnifyingGlassIcon,
    calc: CalculatorIcon,
    command: CommandIcon,
    action: SlidersHorizontalIcon,
    claude: SparkleIcon
  }
  const Icon = $derived(ICONS[result.kind])

  let src = $state<string | null>(null)
  $effect(() => {
    const { id, kind } = result
    src = null
    if (kind !== 'app' && kind !== 'file' && kind !== 'folder') return
    let alive = true
    void window.photon.resultIcon(id).then((icon) => alive && (src = icon))
    return () => {
      alive = false
    }
  })
</script>

<span class="icon" class:claude={result.kind === 'claude'} aria-hidden="true">
  {#if src}<img {src} alt="" />{:else}<Icon size={20} weight="duotone" />{/if}
</span>

<style>
  .icon {
    flex: none;
    width: 32px;
    height: 32px;
    display: grid;
    place-items: center;
    border-radius: var(--radius-icon);
    background: var(--white-6);
    color: var(--text-muted);
  }

  .claude {
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 14%, transparent);
  }

  img {
    width: 24px;
    height: 24px;
  }
</style>
