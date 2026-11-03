// Son de Windows partagé par les trois designs du widget Son : état lu, volume (curseur tenu =
// sa position), muet, sortie. Relu par le composant (pollWhileVisible).
import HeadphonesIcon from 'phosphor-svelte/lib/HeadphonesIcon'
import MonitorIcon from 'phosphor-svelte/lib/MonitorIcon'
import SpeakerHifiIcon from 'phosphor-svelte/lib/SpeakerHifiIcon'
import type { Component } from 'svelte'
import type { AudioState } from '../../../shared/api'
import type { DeviceKind } from './devices'

export class Sound {
  audio = $state.raw<AudioState | null>(null)
  failed = $state(false)
  drag = $state<number | null>(null) // curseur tenu : la lecture suivante ne l'écrase pas
  volume = $derived(this.drag ?? this.audio?.volume ?? 0)

  apply = (next: AudioState | null): void => {
    if (next) this.audio = next
    this.failed = !next && !this.audio
  }

  read = async (): Promise<void> => this.apply(await window.photon.audio())

  // Comme le volume de Windows : bouger le curseur rétablit le son coupé.
  set = async (value: number): Promise<void> => {
    const v = Math.round(Math.min(100, Math.max(0, value)))
    if (this.audio?.muted) void window.photon.audioMute(false)
    this.apply(await window.photon.audioVolume(v))
  }

  wheel = (event: WheelEvent): void => {
    if (!this.audio || event.deltaY === 0) return
    void this.set(this.audio.volume - Math.sign(event.deltaY) * 2)
  }

  mute = async (): Promise<void> => this.apply(await window.photon.audioMute(!this.audio?.muted))

  device = async (id: string): Promise<void> => this.apply(await window.photon.audioDevice(id))
}

export const DEVICE_ICONS: Record<DeviceKind, Component> = {
  headphones: HeadphonesIcon,
  monitor: MonitorIcon,
  speaker: SpeakerHifiIcon
}
