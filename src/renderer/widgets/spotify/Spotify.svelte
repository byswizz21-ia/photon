<script lang="ts">
  // Spotify : design « Sobre » commun (lib/MusicPlayer.svelte) ou « Adapté » (SpotifyCustom.svelte).
  import MusicWidget from '../../lib/music/MusicWidget.svelte'
  import type { MusicSettings } from '../../lib/MusicPlayer.svelte'
  import type { WidgetProps } from '../types'
  import Custom from './SpotifyCustom.svelte'

  let props: WidgetProps<MusicSettings> = $props()
</script>

<MusicWidget {...props} service="spotify" custom={Custom} />
