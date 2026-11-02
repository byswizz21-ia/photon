// Données d'un widget de musique, communes aux designs « Sobre » et « Adapté » : morceau en cours
// relu chaque seconde fenêtre visible, file de YT Music si la vue l'affiche, couleurs de la
// pochette (halo et accent de l'app en option). À créer pendant l'initialisation du composant.
import { untrack } from 'svelte'
import type { MusicCommand, MusicQueueItem, MusicService, MusicState } from '../../../shared/api'
import { DEFAULT_ACCENT } from '../../../shared/model'
import { accentFromPixels } from '../../theme/accent'
import { borrowAccent } from '../../theme/apply.svelte'
import { pollWhileVisible } from '../poll.svelte'

export class MusicSource {
  music = $state.raw<MusicState>()
  track = $derived(this.music?.track ?? null)
  queue = $state.raw<MusicQueueItem[]>([])
  wantQueue = $state(false) // la vue affiche « À suivre » (YT Music seulement)
  tint = $state('') // couleur moyenne de la pochette
  accent = $state<string | null>(null) // couleur vive de la pochette ; null : pochette grise

  constructor(
    readonly service: MusicService,
    borrow: () => boolean // réglage « accent de l'app pris sur la pochette »
  ) {
    pollWhileVisible(this.read, 1_000)
    pollWhileVisible(this.readQueue, 3_000)
    $effect(() => {
      // untrack : relancé quand la file apparaît, pas à chaque lecture du morceau.
      if (this.wantQueue) untrack(() => void this.readQueue())
    })
    $effect(() => this.readColors(this.track?.artwork))
    $effect(() => {
      if (!borrow() || !this.track?.playing || !this.accent) return
      borrowAccent(this.accent)
      return () => borrowAccent(null)
    })
  }

  read = async (): Promise<void> => {
    this.music = await window.photon.music(this.service)
  }

  readQueue = async (): Promise<void> => {
    if (this.service !== 'ytmusic') return // seul YT Music expose sa file
    this.queue = this.wantQueue && this.music?.ready ? await window.photon.musicQueue() : []
  }

  async control(command: MusicCommand): Promise<void> {
    await window.photon.musicControl(this.service, command)
    setTimeout(() => void this.read(), 250) // le service met son état à jour après le clic
  }

  async seek(seconds: number): Promise<void> {
    await window.photon.musicSeek(this.service, seconds)
    await this.read()
  }

  async play(id: string): Promise<void> {
    await window.photon.musicPlay(id)
    setTimeout(() => void Promise.all([this.read(), this.readQueue()]), 400)
  }

  open(): void {
    window.photon.musicOpen(this.service)
  }

  // Couleur moyenne (l'image réduite à 1 pixel) pour le halo ; couleur vive (comme l'accent
  // « auto » du fond) pour l'accent de l'app.
  private readColors(src: string | undefined): void {
    if (!src) return
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 48
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (!context) return
      context.drawImage(image, 0, 0, 1, 1)
      const [r, g, b] = context.getImageData(0, 0, 1, 1).data
      this.tint = `rgb(${r} ${g} ${b})`
      context.drawImage(image, 0, 0, 48, 48)
      const accent = accentFromPixels(context.getImageData(0, 0, 48, 48).data)
      this.accent = accent === DEFAULT_ACCENT ? null : accent
    }
    image.src = src
  }
}

export const clock = (seconds: number): string => {
  const s = Math.max(0, Math.floor(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// Position cliquée sur une barre, de 0 à 1.
export const ratioAt = (event: MouseEvent): number => {
  const box = (event.currentTarget as HTMLElement).getBoundingClientRect()
  return Math.min(1, Math.max(0, (event.clientX - box.left) / box.width))
}
