<script lang="ts">
  // Pastille de la couleur choisie et bouton pipette ; un clic sur un format le copie ; les
  // dernières couleurs en dessous (clic : la reprendre). Mode édition : vider l'historique.
  import CheckIcon from 'phosphor-svelte/lib/CheckIcon'
  import EyedropperIcon from 'phosphor-svelte/lib/EyedropperIcon'
  import { onAccent } from '../../theme/accent'
  import type { WidgetProps } from '../types'
  import { formats, isHex } from './colors'
  import type { ColorPickerSettings } from './manifest'

  let { settings, editing, save }: WidgetProps<ColorPickerSettings> = $props()

  const MAX_COLORS = 12

  const colors = $derived(settings.colors.filter(isHex).slice(0, MAX_COLORS))
  const color = $derived(colors[0] ?? null)
  let picking = $state(false)
  let copied = $state<string | null>(null)

  function use(hex: string): void {
    save({ ...settings, colors: [hex, ...colors.filter((c) => c !== hex)].slice(0, MAX_COLORS) })
  }

  async function pick(): Promise<void> {
    picking = true
    const hex = await window.photon.pickColor()
    picking = false
    if (hex) use(hex)
  }

  function copy(value: string): void {
    window.photon.copyText(value)
    copied = value
    setTimeout(() => (copied = null), 1200)
  }
</script>

<div class="widget">
  <div class="head">
    <span class="label">Pipette</span>
    {#if editing && colors.length}
      <button type="button" class="clear" onclick={() => save({ ...settings, colors: [] })}
        >Vider</button
      >
    {/if}
  </div>
  <div class="top">
    <button
      type="button"
      class="swatch"
      style:background={color ?? 'var(--white-5)'}
      style:color={color ? onAccent(color) : 'var(--text-muted)'}
      disabled={picking}
      aria-label="Prendre une couleur à l'écran (clic droit ou Échap : annuler)"
      title="Clic : prendre une couleur à l'écran · clic droit ou Échap : annuler"
      onclick={pick}
    >
      <EyedropperIcon size={20} weight={color ? 'fill' : 'regular'} aria-hidden="true" />
    </button>
    {#if color}
      <ul class="formats">
        {#each formats(color) as f (f.label)}
          <li>
            <button type="button" onclick={() => copy(f.value)} aria-label="Copier {f.value}">
              <span class="tag">{f.label}</span>
              <span class="value">{f.value}</span>
              {#if copied === f.value}<CheckIcon size={12} aria-hidden="true" />{/if}
            </button>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="hint">Clique la pipette, puis n'importe où sur tes écrans.</p>
    {/if}
  </div>
  {#if colors.length > 1}
    <div class="history">
      {#each colors.slice(1) as hex (hex)}
        <button
          type="button"
          class="dot"
          style:background={hex}
          aria-label="Reprendre {hex}"
          title={hex}
          onclick={() => use(hex)}
        ></button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .widget {
    box-sizing: border-box;
    height: 100%;
    padding: clamp(12px, 8cqmin, 20px);
    display: flex;
    flex-direction: column;
    gap: 10px;
    overflow: hidden;
  }

  .head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  .label {
    font-size: var(--text-12);
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
    color: var(--text-faint);
  }

  button {
    padding: 0;
    border: 0;
    font: inherit;
    cursor: pointer;
  }

  .clear {
    background: none;
    color: var(--text-muted);
    font-size: var(--text-12);
  }

  .clear:hover {
    color: var(--text);
  }

  .top {
    display: flex;
    gap: 12px;
    align-items: center;
    min-height: 0;
  }

  .swatch {
    flex: none;
    display: grid;
    place-items: center;
    width: 64px;
    height: 64px;
    border-radius: var(--radius-tile);
    box-shadow: inset 0 0 0 1px var(--white-12);
    transition: transform var(--dur-press) var(--ease-out);
  }

  .swatch:active {
    transform: scale(var(--press-scale));
  }

  .swatch:disabled {
    opacity: 0.5;
  }

  .hint {
    margin: 0;
    font-size: var(--text-13);
    color: var(--text-muted);
  }

  .formats {
    flex: 1;
    min-width: 0;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .formats button {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    min-height: 24px;
    padding: 0 6px;
    border-radius: var(--radius-menu-item);
    background: none;
    color: var(--text);
    text-align: left;
  }

  .formats button:hover {
    background: var(--surface-hover);
  }

  .tag {
    width: 28px;
    font-size: var(--text-11);
    color: var(--text-faint);
  }

  .value {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--text-13);
    font-variant-numeric: tabular-nums;
  }

  .history {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .dot {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    box-shadow: inset 0 0 0 1px var(--white-15);
  }

  button:focus-visible {
    outline: var(--focus-ring);
    outline-offset: var(--focus-offset);
  }
</style>
