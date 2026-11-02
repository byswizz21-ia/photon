<script lang="ts">
  // SoundCloud : design « Sobre » commun (lib/MusicPlayer.svelte) ou « Adapté » (SoundCloudCustom.svelte).
  import MusicWidget from '../../lib/music/MusicWidget.svelte'
  import type { MusicSettings } from '../../lib/MusicPlayer.svelte'
  import type { WidgetProps } from '../types'
  import Custom from './SoundCloudCustom.svelte'

  let props: WidgetProps<MusicSettings> = $props()
</script>

<MusicWidget {...props} service="soundcloud" custom={Custom} />
