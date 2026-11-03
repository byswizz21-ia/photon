<script lang="ts">
  // Pile des notifications, en bas à droite : la plus récente en bas, 4 au plus (la plus
  // ancienne cède sa place). Survoler la pile met tous les comptes à rebours en pause.
  import { flip } from 'svelte/animate'
  import { prefersReducedMotion } from 'svelte/motion'
  import type { Toast } from '../../shared/api'
  import { ring } from '../sound.svelte'
  import { fontStack } from '../theme/apply.svelte'
  import ToastCard from './ToastCard.svelte'

  const MAX = 4
  const REPLACED = ['music', 'test'] // une seule carte à la fois pour ces sources

  let toasts = $state<Toast[]>([])
  let leaving = $state<number[]>([]) // cartes en train de sortir
  let still = $state(false)
  let inside = false // souris sur une carte : la fenêtre capte les clics

  // Durée d'un jeton (« 450ms »), pour l'animation de réordonnancement.
  const tokenMs = (name: string): number =>
    parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || 0

  window.toasts.onLook((look) => {
    const style = document.documentElement.style
    style.setProperty('--accent', look.accent)
    style.setProperty('--on-accent', look.onAccent)
    style.setProperty('--radius', `${look.radius}px`)
    style.setProperty('--font-sans', fontStack(look.font))
    style.setProperty('--weight-shift', String(look.weight))
    style.setProperty('--font-scale', String(look.scale))
  })

  window.toasts.onShow((toast) => {
    still = toast.still || prefersReducedMotion.current
    for (const old of toasts)
      if (REPLACED.includes(toast.source) && old.source === toast.source) leave(old.id)
    toasts.push(toast)
    const shown = toasts.filter((t) => !leaving.includes(t.id))
    if (shown.length > MAX) leave((shown.find((t) => !t.sticky) ?? shown[0]!).id)
    ring('notify', toast.sound, toast.preset)
  })

  // Sortie animée ; Photon sait tout de suite que la carte est fermée.
  function leave(id: number, action?: number): void {
    if (leaving.includes(id) || !toasts.some((t) => t.id === id)) return
    if (action === undefined) window.toasts.close(id)
    else window.toasts.click(id, action)
    if (still) remove(id)
    else leaving.push(id)
  }

  function remove(id: number): void {
    toasts = toasts.filter((t) => t.id !== id)
    leaving = leaving.filter((l) => l !== id)
    if (toasts.length === 0) {
      inside = false
      window.toasts.empty()
    }
  }

  // Zones vides de la fenêtre : la souris passe au travers (mouvements transmis par Electron).
  function track(event: MouseEvent): void {
    const over = event.target instanceof Element && event.target.closest('.card') !== null
    if (over === inside) return
    inside = over
    window.toasts.hover(over)
  }
</script>

<svelte:document onmousemove={track} />

<div class="stack" class:still>
  {#each toasts as toast (toast.id)}
    <div class="slot" animate:flip={{ duration: still ? 0 : tokenMs('--dur-spring-card') }}>
      <ToastCard
        {toast}
        leaving={leaving.includes(toast.id)}
        onclose={() => leave(toast.id)}
        onaction={(action) => leave(toast.id, action)}
        ongone={() => remove(toast.id)}
      />
    </div>
  {/each}
</div>

<style>
  .stack {
    position: fixed;
    right: 20px;
    bottom: 24px;
    left: 20px;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 10px;
    pointer-events: none;
  }
</style>
