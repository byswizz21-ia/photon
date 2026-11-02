<script lang="ts">
  // Vidéo en boucle : lib/MediaCard.svelte, muette sauf option « Son ».
  import MediaCard from '../../lib/MediaCard.svelte'
  import type { WidgetProps } from '../types'
  import type { VideoSettings } from './manifest'

  let { settings, editing, save }: WidgetProps<VideoSettings> = $props()
</script>

<MediaCard
  kind="video"
  file={settings.file}
  fit={settings.fit}
  sound={settings.sound}
  {editing}
  change={(patch) => save({ ...settings, ...patch })}
/>
