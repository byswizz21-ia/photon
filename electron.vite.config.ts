import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'electron-vite'

export default defineConfig({
  main: {},
  preload: {
    build: {
      rollupOptions: {
        // player : préchargement des lecteurs de musique cachés (src/main/music.ts)
        // toast : fenêtre des notifications (src/main/toast.ts)
        input: {
          index: 'src/preload/index.ts',
          player: 'src/preload/player.ts',
          toast: 'src/preload/toast.ts'
        }
      }
    }
  },
  renderer: {
    plugins: [svelte()],
    build: {
      rollupOptions: {
        input: { index: 'src/renderer/index.html', toast: 'src/renderer/toast.html' }
      }
    }
  }
})
