<script lang="ts">
  // Flou réglable en mode fenêtre : capture de l'écran sous Photon (src/main/backdrop.ts), calée
  // sur l'écran et floutée par le panneau. Montée seulement fenêtre visible. Avant la 1re image
  // (≈ 250 ms), ou si la capture est refusée, on voit l'acrylic de Windows.
  import type { Placement } from '../../shared/api'

  let { place, display }: { place: Placement; display: number } = $props()

  let video: HTMLVideoElement
  let ready = $state(false)

  // Nouvel écran sous la fenêtre : nouvelle capture. Un déplacement ne change que la position.
  $effect(() => {
    void display
    let alive = true
    let stream: MediaStream | null = null
    ready = false
    navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: false }).then(
      async (s) => {
        stream = s
        if (!alive) return s.getTracks().forEach((t) => t.stop())
        video.srcObject = s
        await video.play()
        video.requestVideoFrameCallback(() => (ready = alive))
      },
      (error: unknown) => console.warn('[photon] flou réglable : capture refusée', error)
    )
    return () => {
      alive = false
      stream?.getTracks().forEach((t) => t.stop())
      video.srcObject = null
    }
  })
</script>

<video
  bind:this={video}
  class:ready
  muted
  disablepictureinpicture
  aria-hidden="true"
  style:width="{place.width}px"
  style:height="{place.height}px"
  style:transform="translate({place.x}px, {place.y}px)"
></video>

<style>
  video {
    position: absolute;
    left: 0;
    top: 0;
    object-fit: fill;
    opacity: 0;
    transition: opacity var(--dur-fade) var(--ease-out);
  }

  .ready {
    opacity: 1;
  }
</style>
