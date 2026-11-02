// Préchargé dans les lecteurs cachés Deezer et SoundCloud (src/main/music.ts), avant la page.
// Note les actions que la page déclare à Windows (mediaSession : lecture, suivant, position…)
// et ses éléments audio : Photon les pilote sans dépendre des boutons du site, qui changent.
// Pas de pont vers Photon : main lit window.__photon par executeJavaScript.
import { contextBridge } from 'electron'

// Exécutée dans la page elle-même : autonome (sérialisée, sans import ni variable extérieure).
function hook(): void {
  const session = navigator.mediaSession
  const handlers: Partial<Record<MediaSessionAction, MediaSessionActionHandler>> = {}
  const media = new Set<HTMLMediaElement>()
  let position: { position: number; duration: number; rate: number; at: number } | null = null
  let volume: number | null = null // choisi dans Photon, gardé pour les morceaux suivants

  const setAction = session.setActionHandler.bind(session)
  session.setActionHandler = (action, handler) => {
    if (handler) handlers[action] = handler
    else delete handlers[action]
    setAction(action, handler)
  }
  const setPosition = session.setPositionState.bind(session)
  session.setPositionState = (state) => {
    position = state?.duration
      ? {
          position: state.position ?? 0,
          duration: state.duration,
          rate: state.playbackRate ?? 1,
          at: Date.now()
        }
      : null
    setPosition(state)
  }
  const play = HTMLMediaElement.prototype.play
  HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
    media.delete(this)
    media.add(this)
    // ponytail: 4 derniers éléments joués ; une page qui en joue plus à la fois serait mal lue.
    if (media.size > 4) media.delete(media.values().next().value as HTMLMediaElement)
    if (volume !== null) this.volume = volume
    return play.call(this)
  }

  // Élément qui joue, sinon le dernier lancé.
  const element = (): HTMLMediaElement | undefined => {
    const all = [...Array.from(media), ...Array.from(document.querySelectorAll('audio, video'))]
    return (all as HTMLMediaElement[]).find((e) => !e.paused) ?? Array.from(media).pop()
  }
  const isPlaying = (el = element()): boolean =>
    el ? !el.paused : session.playbackState === 'playing'
  const finite = (n: number | undefined): number => (n !== undefined && Number.isFinite(n) ? n : 0)
  const act = (action: MediaSessionAction, details: Partial<MediaSessionActionDetails> = {}) =>
    handlers[action]?.({ action, ...details } as MediaSessionActionDetails)

  const api = {
    state() {
      const meta = session.metadata
      if (!meta?.title) return null
      const el = element()
      const playing = isPlaying(el)
      const art = meta.artwork[meta.artwork.length - 1]
      // Position déclarée par la page (avancée depuis), sinon celle de l'élément audio.
      const time = position
        ? Math.min(
            position.duration,
            position.position + (playing ? ((Date.now() - position.at) / 1000) * position.rate : 0)
          )
        : finite(el?.currentTime)
      return {
        title: meta.title,
        artist: meta.artist,
        artworkUrl: art ? new URL(art.src, location.href).href : '',
        playing,
        time,
        duration: position?.duration ?? finite(el?.duration),
        canSeek: Boolean(handlers.seekto || el),
        volume: el ? Math.round(el.volume * 100) : -1
      }
    },
    toggle() {
      const el = element()
      const action = isPlaying(el) ? 'pause' : 'play'
      if (handlers[action]) act(action)
      else if (el) void (action === 'play' ? el.play() : el.pause())
    },
    next: () => act('nexttrack'),
    previous: () => act('previoustrack'),
    seek(seconds: number) {
      const el = element()
      if (handlers.seekto) act('seekto', { seekTime: seconds })
      else if (el) el.currentTime = seconds
    },
    volume(percent: number) {
      volume = percent / 100
      for (const el of [...Array.from(media), element()]) if (el) el.volume = volume
    }
  }
  Object.defineProperty(window, '__photon', { value: Object.freeze(api) })
}

contextBridge.executeInMainWorld({ func: hook })
