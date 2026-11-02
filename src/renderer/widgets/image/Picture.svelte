<script lang="ts">
  // Image décorative : lib/MediaCard.svelte, réglages { image, fit } de ce widget.
  import MediaCard from '../../lib/MediaCard.svelte'
  import type { WidgetProps } from '../types'
  import type { ImageSettings } from './manifest'

  let { settings, editing, save }: WidgetProps<ImageSettings> = $props()
</script>

<MediaCard
  kind="image"
  file={settings.image}
  fit={settings.fit}
  {editing}
  change={({ file, ...patch }) =>
    save({ ...settings, ...patch, ...(file === undefined ? {} : { image: file }) })}
/>
