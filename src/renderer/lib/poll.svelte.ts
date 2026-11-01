// Lecture répétée pour les widgets : tout de suite à l'ouverture de Photon, puis toutes les
// `ms` millisecondes, et seulement fenêtre visible (rien ne tourne quand Photon est caché).
// À appeler pendant l'initialisation du composant (comme un $effect).
import { app } from '../state.svelte'

export function pollWhileVisible(read: () => unknown, ms: number): void {
  $effect(() => {
    if (!app.visible) return
    // Lecture lente (lecteur réseau) : on saute les tours tant que la précédente n'a pas fini.
    let busy = false
    const run = (): void => {
      if (busy) return
      busy = true
      Promise.resolve()
        .then(read)
        .catch((error: unknown) => console.error('[photon] lecture impossible', error))
        .finally(() => (busy = false))
    }
    run()
    const timer = setInterval(run, ms)
    return () => clearInterval(timer)
  })
}
