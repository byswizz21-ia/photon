<script lang="ts">
  // SoundCloud : lecteur de musique partagé (lib/MusicPlayer.svelte).
  import MusicPlayer, { type MusicSettings } from '../../lib/MusicPlayer.svelte'
  import type { WidgetProps } from '../types'

  let props: WidgetProps<MusicSettings> = $props()
</script>

<MusicPlayer {...props} service="soundcloud" />
