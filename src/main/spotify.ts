// Spotify : l'app Spotify de Windows, via l'outil natif spotify.cs (contrôles média de Windows).
// Spotify web ne lit rien dans Electron (DRM Widevine absent), d'où l'app plutôt qu'un lecteur
// caché. Outil lancé à la première lecture du widget seulement, fenêtre Photon visible.
import { shell } from 'electron'
import type { MusicCommand, MusicState } from '../shared/api'
import { nativeTool } from './native'
import source from './spotify.cs?raw'

const tool = nativeTool(source, 'Photon.Spotify')
const NONE: MusicState = { ready: true, signedIn: false, track: null }

interface RawState {
  found?: boolean
  error?: string
  title: string
  artist: string
  playing: boolean
  time: number
  duration: number
  canSeek: boolean
  volume: number // -1 : Spotify ne joue sur aucune sortie
  shuffle: boolean | null
  repeat: 'none' | 'all' | 'one' | null
  art: string // clé de la pochette : change avec le morceau
}

// Pochette du morceau en cours, en data URL ; ready : sa lecture (notification).
let artwork = { key: '', data: '', ready: Promise.resolve('') }

async function send(command: string): Promise<MusicState> {
  const line = await tool.send(command)
  try {
    const raw = JSON.parse(line ?? 'null') as RawState | null
    if (raw?.error) console.warn(`[photon] spotify : ${raw.error}`)
    if (!raw?.found) return NONE
    const { title, artist, playing, time, duration, canSeek, volume, shuffle, repeat } = raw
    // « J'aime » : Spotify ne le publie pas à Windows.
    const track = {
      title,
      artist,
      playing,
      time,
      duration,
      canSeek,
      volume,
      like: null,
      shuffle,
      repeat,
      artwork: cover(raw.art)
    }
    return { ready: true, signedIn: true, track }
  } catch {
    return NONE
  }
}

// Pochette lue en fond au changement de morceau ; elle arrive à la lecture suivante.
function cover(key: string): string {
  if (key === artwork.key) return artwork.data
  const entry = { key, data: '', ready: readArtwork() }
  artwork = entry
  void entry.ready.then((data) => (entry.data = data))
  return ''
}

async function readArtwork(): Promise<string> {
  try {
    const { data } = JSON.parse((await tool.send('art')) ?? '{}') as { data?: string }
    return data?.startsWith('data:image/') ? data : ''
  } catch {
    return '' // pochette illisible : on garde l'icône
  }
}

export const spotifyArtwork = (): Promise<string> => artwork.ready

export const spotifyState = (): Promise<MusicState> => send('state')

const COMMANDS = new Set<MusicCommand>(['toggle', 'next', 'previous', 'shuffle', 'repeat'])

// like, dislike : sans effet (Spotify ne les publie pas).
export const spotifyControl = async (command: MusicCommand): Promise<MusicState> =>
  COMMANDS.has(command) ? send(command) : spotifyState()

// Nombres seulement, déjà bornés par music.ts : rien d'autre n'atteint l'outil.
export const spotifySeek = (seconds: number): Promise<MusicState> => send(`seek ${seconds}`)

export const spotifyVolume = (volume: number): Promise<MusicState> => send(`volume ${volume}`)

// Ouvre (ou ramène devant) l'app Spotify.
export const openSpotify = (): void => void shell.openExternal('spotify:')
