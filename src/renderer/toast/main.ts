// Fenêtre des notifications (src/main/toast.ts) : chargée une fois au démarrage, cachée à vide.
import { mount } from 'svelte'
import '../app.css'
import Toasts from './Toasts.svelte'

mount(Toasts, { target: document.getElementById('toasts') as HTMLElement })
