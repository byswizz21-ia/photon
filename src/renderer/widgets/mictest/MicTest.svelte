<script lang="ts">
  // « Tester » ouvre le micro : barre de niveau en direct, repère du plus fort des 3 dernières
  // secondes et avis (trop faible, bon, sature). « Enregistrer 5 s » puis réécoute automatique.
  // Réglages bruts (sans réduction de bruit ni gain auto) : on entend le vrai micro.
  // Le micro se ferme sur « Arrêter », quand Photon se cache ou quand le widget disparaît.
  import MicrophoneIcon from 'phosphor-svelte/lib/MicrophoneIcon'
  import PlayIcon from 'phosphor-svelte/lib/PlayIcon'
  import RecordIcon from 'phosphor-svelte/lib/RecordIcon'
  import { app } from '../../state.svelte'
  import type { WidgetProps } from '../types'
  import { decibels, FLOOR_DB, share, verdict } from './level'
  import type { MicTestSettings } from './manifest'

  let { settings, save, preview }: WidgetProps<MicTestSettings> = $props()

  const PEAK_MS = 3000
  const RECORD_MS = 5000

  let devices = $state.raw<MediaDeviceInfo[]>([])
  let stream = $state.raw<MediaStream | null>(null)
  let level = $state(FLOOR_DB)
  let peak = $state(FLOOR_DB)
  let error = $state('')
  let recording = $state(false)
  let clip = $state('') // URL de l'enregistrement
  let player = $state<HTMLAudioElement>()

  let context: AudioContext | null = null
  let frame = 0
  let peaks: { at: number; db: number }[] = []

  async function listDevices(): Promise<void> {
    devices = (await navigator.mediaDevices.enumerateDevices()).filter(
      (d) => d.kind === 'audioinput'
    )
  }

  async function start(): Promise<void> {
    if (preview) return
    error = ''
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: settings.device ? { exact: settings.device } : undefined,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      })
      stream = media
      context = new AudioContext()
      const analyser = context.createAnalyser()
      analyser.fftSize = 2048
      context.createMediaStreamSource(media).connect(analyser)
      const samples = new Float32Array(analyser.fftSize)
      const tick = (): void => {
        analyser.getFloatTimeDomainData(samples)
        level = decibels(samples)
        const now = performance.now()
        peaks = [...peaks.filter((p) => now - p.at < PEAK_MS), { at: now, db: level }]
        peak = Math.max(...peaks.map((p) => p.db))
        frame = requestAnimationFrame(tick)
      }
      tick()
      await listDevices() // noms visibles une fois le micro autorisé
    } catch (e) {
      stop()
      error =
        e instanceof DOMException && e.name === 'NotFoundError'
          ? 'Aucun micro trouvé'
          : e instanceof DOMException && e.name === 'NotAllowedError'
            ? 'Micro bloqué par Windows (Paramètres › Confidentialité › Micro)'
            : 'Micro indisponible'
    }
  }

  function stop(): void {
    cancelAnimationFrame(frame)
    for (const track of stream?.getTracks() ?? []) track.stop()
    void context?.close()
    context = null
    stream = null
    recording = false
    level = FLOOR_DB
    peak = FLOOR_DB
    peaks = []
  }

  function record(): void {
    if (!stream || recording) return
    const recorder = new MediaRecorder(stream)
    const chunks: Blob[] = []
    recorder.ondataavailable = (event) => chunks.push(event.data)
    recorder.onstop = () => {
      recording = false
      if (clip) URL.revokeObjectURL(clip)
      clip = URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType }))
      queueMicrotask(() => void player?.play())
    }
    recording = true
    recorder.start()
    setTimeout(() => recorder.state === 'recording' && recorder.stop(), RECORD_MS)
  }

  // Photon caché : micro fermé.
  $effect(() => {
    if (!app.visible) stop()
  })

  $effect(() => () => {
    stop()
    if (clip) URL.revokeObjectURL(clip)
  })

  const advice = $derived(verdict(peak))
</script>

<div class="w-body">
  <div class="w-head">
    <span class="w-label">Test micro</span>
    {#if stream}<span class="w-hint">{Math.round(level)} dB</span>{/if}
  </div>

  {#if devices.length > 1}
    <select
      class="w-input"
      data-no-drag
      value={settings.device}
      aria-label="Micro"
      onchange={(e) => {
        stop()
        save({ ...settings, device: e.currentTarget.value })
      }}
    >
      <option value="">Micro par défaut</option>
      {#each devices.filter((d) => d.deviceId !== 'default' && d.deviceId !== 'communications') as d (d.deviceId)}
        <option value={d.deviceId}>{d.label || 'Micro'}</option>
      {/each}
    </select>
  {/if}

  {#if stream}
    <div class="meter" aria-hidden="true">
      <div class="fill {advice.tone}" style:transform="scaleX({share(level)})"></div>
      <div class="peak" style:transform="translateX({share(peak) * 100}cqw)"></div>
    </div>
    <p class="advice {advice.tone}" aria-live="polite">{advice.text}</p>
  {:else}
    <p class="w-message">{error || 'Le micro reste fermé tant que tu ne cliques pas.'}</p>
  {/if}

  <div class="w-row actions" data-no-drag>
    {#if stream}
      <button type="button" class="action" disabled={recording} onclick={record}>
        <RecordIcon size={14} weight="fill" color="var(--danger)" aria-hidden="true" />
        {recording ? 'Enregistrement…' : 'Enregistrer 5 s'}
      </button>
      <button type="button" class="action" onclick={stop}>Arrêter</button>
    {:else}
      <button type="button" class="action primary" onclick={start}>
        <MicrophoneIcon size={14} weight="fill" aria-hidden="true" /> Tester
      </button>
    {/if}
    {#if clip && !recording}
      <button
        type="button"
        class="action icon"
        aria-label="Réécouter l'enregistrement"
        onclick={() => player?.play()}
        ><PlayIcon size={14} weight="fill" aria-hidden="true" /></button
      >
    {/if}
  </div>
  {#if clip}<audio bind:this={player} src={clip}></audio>{/if}
</div>

<style>
  .meter {
    position: relative;
    height: 10px;
    flex: none;
    border-radius: var(--radius-pill);
    background: var(--white-8);
    overflow: hidden;
    container-type: inline-size;
  }

  .fill {
    position: absolute;
    inset: 0;
    background: var(--accent);
    transform-origin: left;
  }

  .fill.low {
    background: var(--accent-orange);
  }

  .fill.high {
    background: var(--danger);
  }

  .peak {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 2px;
    background: var(--text);
    transition: transform var(--dur-fast) var(--ease-out);
  }

  .advice {
    margin: 0;
    font-size: var(--text-13);
    color: var(--text-muted);
  }

  .advice.ok {
    color: var(--accent);
  }

  .advice.high {
    color: var(--danger-text);
  }

  .actions {
    margin-top: auto;
    flex-wrap: wrap;
  }

  .action:disabled {
    opacity: 0.6;
    cursor: default;
  }
</style>
