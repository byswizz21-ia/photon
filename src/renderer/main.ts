import { mount } from 'svelte'
import App from './App.svelte'
import './app.css'
import { app } from './state.svelte'

// Chargé une seule fois, au démarrage de Windows : ensuite la fenêtre est seulement affichée/cachée.
Object.assign(app, await window.photon.load())
mount(App, { target: document.getElementById('app') as HTMLElement })
