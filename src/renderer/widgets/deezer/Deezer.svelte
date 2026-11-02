<script lang="ts">
  // Deezer : design « Sobre » commun (lib/MusicPlayer.svelte) ou « Adapté » (DeezerCustom.svelte).
  import MusicWidget from '../../lib/music/MusicWidget.svelte'
  import type { MusicSettings } from '../../lib/MusicPlayer.svelte'
  import type { WidgetProps } from '../types'
  import Custom from './DeezerCustom.svelte'

  let props: WidgetProps<MusicSettings> = $props()
</script>

<MusicWidget {...props} service="deezer" custom={Custom} />
