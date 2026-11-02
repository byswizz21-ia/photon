<script lang="ts">
  // YT Music : design « Sobre » commun (lib/MusicPlayer.svelte) ou « Adapté » (MusicCustom.svelte).
  import MusicWidget from '../../lib/music/MusicWidget.svelte'
  import type { MusicSettings } from '../../lib/MusicPlayer.svelte'
  import type { WidgetProps } from '../types'
  import Custom from './MusicCustom.svelte'

  let props: WidgetProps<MusicSettings> = $props()
</script>

<MusicWidget {...props} service="ytmusic" custom={Custom} />
