import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'electron-vite'

export default defineConfig({
  main: {},
  preload: {
    build: {
      rollupOptions: {
        // player : préchargement des lecteurs de musique cachés (src/main/music.ts)
        input: { index: 'src/preload/index.ts', player: 'src/preload/player.ts' }
      }
    }
  },
  renderer: {
    plugins: [svelte()]
  }
})
