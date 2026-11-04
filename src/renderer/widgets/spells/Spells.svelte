<script lang="ts">
  // Sorts d'Urgot : A vide la corbeille, Z ferme les apps gourmandes (Géhenne), E bascule
  // « Ne pas déranger », R éteint le PC dans 60 s (2e appui pour confirmer, 3e pour annuler).
  // Clic sur la tuile, ou touche du clavier quand une tuile a le focus (ailleurs, une lettre part
  // dans la barre de commande : taper « arez » ne doit rien lancer). Recharge propre à chaque sort.
  import FireIcon from 'phosphor-svelte/lib/FireIcon'
  import FlaskIcon from 'phosphor-svelte/lib/FlaskIcon'
  import LinkIcon from 'phosphor-svelte/lib/LinkIcon'
  import ShieldIcon from 'phosphor-svelte/lib/ShieldIcon'
  import type { Component } from 'svelte'
  import { bytes } from '../../lib/format'
  import { pollWhileVisible } from '../../lib/poll.svelte'
  import { app } from '../../state.svelte'
  import type { WidgetProps } from '../types'
  import type { SpellsSettings } from './manifest'
  import { ARM_MS, armed, remaining, spellFromKey, type SpellKey } from './spells'

  let { editing, preview }: WidgetProps<SpellsSettings> = $props()

  let castAt = $state<Partial<Record<SpellKey, number>>>({})
  let armedAt = $state<number | null>(null)
  let now = $state(Date.now())
  let hint = $state('')
  let dnd = $state<boolean | null>(null) // inconnu tant que E n'a pas été lancé
  let shutdownAt = $state<number | null>(null) // extinction programmée (par R ou le minuteur)

  pollWhileVisible(async () => {
    const state = await window.photon.shutdownState()
    shutdownAt = state.action === 'shutdown' ? state.at : null
  }, 5_000)

  const isArmed = $derived(armed(armedAt, now))
  const left = (key: SpellKey): number => remaining(key, castAt[key], now)
  const busy = $derived(isArmed || (Object.keys(castAt) as SpellKey[]).some((k) => left(k) > 0))

  // Horloge des recharges : tourne seulement pendant une recharge ou R armé, Photon visible.
  $effect(() => {
    if (!busy || !app.visible) return
    const timer = setInterval(() => (now = Date.now()), 250)
    return () => clearInterval(timer)
  })

  // Message effacé quelques secondes après.
  $effect(() => {
    if (!hint) return
    const timer = setTimeout(() => (hint = ''), ARM_MS)
    return () => clearTimeout(timer)
  })

  const SPELLS: { key: SpellKey; icon: Component; name: string; action: () => string }[] = [
    { key: 'A', icon: FlaskIcon, name: 'Torpille corrosive', action: () => 'Vider la corbeille' },
    { key: 'Z', icon: FireIcon, name: 'Géhenne', action: () => 'Fermer les apps gourmandes' },
    {
      key: 'E',
      icon: ShieldIcon,
      name: 'Mépris',
      action: () => (dnd ? 'Ne pas déranger · actif' : 'Ne pas déranger')
    },
    {
      key: 'R',
      icon: LinkIcon,
      name: 'Peur au-delà de la mort',
      action: () => (shutdownAt ? 'Annuler l’extinction' : 'Éteindre le PC')
    }
  ]

  async function run(key: SpellKey): Promise<string> {
    if (key === 'A') {
      const before = await window.photon.trash()
      if (before?.count === 0) return 'Corbeille déjà vide'
      const after = await window.photon.trashEmpty()
      if (!after) return 'Corbeille illisible'
      return `Corbeille vidée · ${bytes(Math.max(0, (before?.bytes ?? 0) - after.bytes))} libérés`
    }
    if (key === 'Z') {
      const closed = await window.photon.processPurge()
      return closed.length ? `Purgées : ${closed.join(', ')}` : 'Rien à purger'
    }
    if (key === 'E') {
      dnd = await window.photon.dndToggle()
      return dnd === null
        ? 'Ne pas déranger indisponible'
        : `Ne pas déranger ${dnd ? 'activé' : 'coupé'}`
    }
    const state = await window.photon.shutdownStart('shutdown', 1)
    shutdownAt = state.at
    return 'Extinction dans 60 s · R pour annuler'
  }

  async function cast(key: SpellKey): Promise<void> {
    if (preview || editing) return // aperçu du catalogue : rien n'est lancé
    now = Date.now()
    // Extinction en cours : R l'annule tout de suite, recharge ou pas.
    if (key === 'R' && shutdownAt) {
      await window.photon.shutdownCancel()
      shutdownAt = null
      armedAt = null
      hint = 'Extinction annulée'
      return
    }
    if (left(key) > 0) return
    if (key === 'R' && !isArmed) {
      armedAt = now
      hint = 'R encore une fois pour confirmer'
      return
    }
    armedAt = null
    castAt[key] = now
    hint = await run(key)
  }

  // Clavier : seulement focus sur une tuile (écouteur posé sur chaque tuile).
  function onkeydown(event: KeyboardEvent): void {
    if (editing || preview || event.repeat) return
    const key = spellFromKey(event)
    if (!key) return
    event.preventDefault()
    event.stopPropagation() // la lettre ne part pas dans la barre de commande (App.svelte)
    void cast(key)
  }
</script>

<div class="w-body">
  <div class="w-head">
    <span class="w-label">Sorts</span>
    <span class="hint" class:danger={isArmed} class:done={hint && !isArmed}>
      {hint || 'Clique une tuile, puis A Z E R'}
    </span>
  </div>
  <div class="tiles">
    {#each SPELLS as spell (spell.key)}
      {@const cd = left(spell.key)}
      {@const danger = spell.key === 'R' && (isArmed || shutdownAt !== null)}
      <button
        type="button"
        class="tile"
        class:on={spell.key === 'E' && dnd}
        class:danger
        title="{spell.name} · {spell.action()}"
        data-no-drag
        {onkeydown}
        onclick={() => cast(spell.key)}
      >
        <span class="key" class:cooling={cd > 0}>
          <spell.icon size={24} weight="duotone" aria-hidden="true" />
          <kbd class="w-kbd">{spell.key}</kbd>
        </span>
        <span class="text" class:cooling={cd > 0}>
          <span class="name">{spell.name}</span>
          <span class="does">{spell.action()}</span>
        </span>
        <span class="cd" class:show={cd > 0} aria-hidden={cd === 0}>{cd || ''}</span>
      </button>
    {/each}
  </div>
</div>

<style>
  .hint {
    min-width: 0;
    font-size: var(--text-12);
    color: var(--text-faint);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .hint.done {
    color: var(--accent);
  }

  .hint.danger {
    color: var(--danger-text);
  }

  .tiles {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-rows: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .tile {
    position: relative;
    min-width: 0;
    min-height: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px 6px 8px;
    border: 1px solid var(--line);
    border-radius: calc(var(--radius) * 0.65);
    background: var(--white-5);
    color: var(--text);
    font: inherit;
    text-align: left;
    cursor: pointer;
    overflow: hidden;
    transition: transform var(--dur-spring) var(--ease-spring);
  }

  .tile:hover {
    transform: translateY(var(--hover-lift));
  }

  .tile:active {
    transform: scale(var(--press-scale));
    transition-duration: var(--dur-press);
  }

  .tile.on {
    border-color: color-mix(in srgb, var(--accent) 45%, transparent);
    background: color-mix(in srgb, var(--accent) 16%, transparent);
  }

  .tile.danger {
    border-color: var(--danger-border-soft);
    background: var(--danger-surface);
  }

  .tile:focus-visible {
    outline: var(--focus-ring);
    outline-offset: var(--focus-offset);
  }

  .key {
    flex: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    color: var(--accent);
  }

  .text {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .cooling {
    opacity: 0.25;
  }

  .name {
    font-size: var(--text-12);
    font-weight: var(--weight-medium);
    line-height: 1.15;
    text-wrap: pretty;
  }

  .does {
    font-size: var(--text-11);
    line-height: 1.15;
    color: var(--text-faint);
    text-wrap: pretty;
  }

  /* Secondes de recharge par-dessus la tuile : seulement l'opacité change. */
  .cd {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    font-size: var(--text-display-s);
    font-weight: var(--weight-light);
    font-variant-numeric: tabular-nums;
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--dur-fast) var(--ease-out);
  }

  .cd.show {
    opacity: 1;
  }
</style>
