// Lecture répétée pour les widgets : tout de suite à l'ouverture de Photon, puis toutes les
// `ms` millisecondes, et seulement fenêtre visible (rien ne tourne quand Photon est caché).
// À appeler pendant l'initialisation du composant (comme un $effect).
import { app } from '../state.svelte'

export function pollWhileVisible(read: () => unknown, ms: number): void {
  $effect(() => {
    if (!app.visible) return
    const run = (): void => {
      Promise.resolve()
        .then(read)
        .catch((error: unknown) => console.error('[photon] lecture impossible', error))
    }
    run()
    const timer = setInterval(run, ms)
    return () => clearInterval(timer)
  })
}
