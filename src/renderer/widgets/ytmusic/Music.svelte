<script lang="ts">
  // YT Music : lecteur de musique partagé (lib/MusicPlayer.svelte).
  import MusicPlayer from '../../lib/MusicPlayer.svelte'
  import type { WidgetProps } from '../types'
  import type { MusicSettings } from './manifest'

  // Aucun réglage : props déclarées pour le type seulement (voir System.svelte).
  // eslint-disable-next-line no-empty-pattern
  let {}: WidgetProps<MusicSettings> = $props()
</script>

<MusicPlayer service="ytmusic" />
