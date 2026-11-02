<script lang="ts">
  // GIF : lib/MediaCard.svelte (fichier, ou lien Giphy / Tenor téléchargé une fois).
  import MediaCard from '../../lib/MediaCard.svelte'
  import type { WidgetProps } from '../types'
  import type { GifSettings } from './manifest'

  let { settings, editing, save }: WidgetProps<GifSettings> = $props()
</script>

<MediaCard
  kind="gif"
  file={settings.file}
  fit={settings.fit}
  {editing}
  change={(patch) => save({ ...settings, ...patch })}
/>
