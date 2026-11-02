// Animation de première ouverture (maquette « Ouverture Photon ») : plein écran 14,4 s, fenêtre
// 10,6 s. L'interface réelle est déjà montée : l'intro anime seulement son apparition, avec
// el.animate et les timings de la maquette (secondes depuis le début). Calques : Intro.svelte.
// Fin, clic ou touche : toutes les animations sont annulées, l'interface reste telle quelle.
import { app, reducedMotion } from '../state.svelte'

type Span = [start: number, duration: number]

interface Plan {
  end: number
  frame: Span | null // fenêtre qui apparaît (mode fenêtre)
  dot: { appear: Span; contract: Span; burst: Span; ring: number } // ring : diamètre de départ / final
  glowA: { show: Span; dim: Span; dimTo: number }
  glowB: { show: Span; to: number }
  grow: Span // lueurs qui s'élargissent
  growFrom: number
  split: Span // les lueurs partent vers deux coins (fractions de la largeur et de la hauteur)
  a: [number, number]
  b: [number, number]
  fade: Span // fond et lueurs de l'intro s'effacent : reste le vrai fond de Photon
  letters: {
    start: number
    step: number
    fade: number
    rise: number
    riseDur: number
    lit: number
    blur: number
  }
  swell: Span // le mot grossit lentement de 4 %
  welcome: { in: Span; out: Span; rise: number; drop: number }
  flip: Span // le nom rejoint l'en-tête
  panel: Span | null // panneau de verre (plein écran)
  sweep: Span
  header: number
  cards: { base: number; spread: number }
  hint: {
    in: Span
    keys: number
    step: number
    press: number
    release: Span
    out: Span
    rise: number
    drop: number
  }
}

const FULL: Plan = {
  end: 14.4,
  frame: null,
  dot: { appear: [0.3, 0.9], contract: [1.15, 0.5], burst: [1.65, 0.8], ring: 40 / 1540 },
  glowA: { show: [1.65, 0.6], dim: [2.2, 2.6], dimTo: 0.55 },
  glowB: { show: [2.8, 2.0], to: 0.8 },
  grow: [1.65, 1.4],
  growFrom: 0.45,
  split: [4.6, 2.4],
  a: [0.29, 0.28],
  b: [0.74, 0.75],
  fade: [9.0, 2.0],
  letters: { start: 2.45, step: 0.07, fade: 0.5, rise: 40, riseDur: 0.9, lit: 0.9, blur: 32 },
  swell: [2.4, 2.6],
  welcome: { in: [3.4, 0.7], out: [4.9, 0.5], rise: 10, drop: 6 },
  flip: [5.0, 1.4],
  panel: [5.15, 1.1],
  sweep: [5.6, 1.5],
  header: 5.9,
  cards: { base: 7.5, spread: 0.4 },
  hint: {
    in: [11.2, 0.7],
    keys: 12.0,
    step: 0.25,
    press: 0.22,
    release: [13.4, 0.45],
    out: [14.0, 0.4],
    rise: 10,
    drop: 0
  }
}

const WINDOW: Plan = {
  end: 10.6,
  frame: [0.1, 0.55],
  dot: { appear: [0.95, 0.7], contract: [1.65, 0.4], burst: [2.0, 0.7], ring: 30 / 1130 },
  glowA: { show: [2.0, 0.5], dim: [2.4, 2.8], dimTo: 0.6 },
  glowB: { show: [2.4, 1.6], to: 0.7 },
  grow: [2.0, 1.2],
  growFrom: 0.4,
  split: [2.4, 2.8],
  a: [0.19, 0.16],
  b: [0.82, 0.83],
  fade: [5.6, 2.0],
  letters: { start: 2.45, step: 0.06, fade: 0.45, rise: 30, riseDur: 0.85, lit: 0.8, blur: 26 },
  swell: [2.4, 1.8],
  welcome: { in: [3.2, 0.6], out: [4.1, 0.4], rise: 8, drop: 5 },
  flip: [4.2, 1.1],
  panel: null,
  sweep: [4.5, 1.3],
  header: 4.55,
  cards: { base: 5.6, spread: 0.3 },
  hint: {
    in: [8.1, 0.6],
    keys: 8.7,
    step: 0.22,
    press: 0.2,
    release: [9.6, 0.45],
    out: [10.1, 0.45],
    rise: 12,
    drop: 8
  }
}

// Bande 0→9 (puis un 0, lib/Digit.svelte) posée sur v : descend jusqu'au 0 du bas, repart du 0
// du haut (même chiffre, saut invisible) et revient sur v. Le ressort s'applique au tour entier.
function fullTurn(strip: HTMLElement): Keyframe[] {
  const v = Math.round(Math.abs(parseFloat(strip.style.transform.replace(/[^\d.-]/g, '')) || 0))
  const k = Math.min((10 - v) / 10, 0.999)
  const y = (n: number): string => `translateY(${-n}em)`
  return [
    { transform: y(v), offset: 0 },
    { transform: y(10), offset: k },
    { transform: y(0), offset: k },
    { transform: y(v), offset: 1 }
  ]
}

// hintTop : ligne du raccourci centrée sous le panneau (px) ; null = bulle en bas de l'écran.
export const intro = $state({ playing: false, hintTop: null as number | null })

let running: Animation[] = []
let endTimer: ReturnType<typeof setTimeout> | undefined

// « Réduire les animations » : pas d'intro, elle compte comme vue.
export function startIntro(): boolean {
  if (reducedMotion()) {
    markSeen()
    return false
  }
  intro.playing = true
  window.photon.intro(true)
  return true
}

export function endIntro(): void {
  if (!intro.playing) return
  clearTimeout(endTimer)
  for (const animation of running) animation.cancel()
  running = []
  intro.playing = false
  intro.hintTop = null
  window.photon.intro(false)
  markSeen()
}

function markSeen(): void {
  if (app.settings.introSeen) return
  app.settings.introSeen = true
  void window.photon.saveSettings({ introSeen: true })
}

// Lancée par le calque de devant une fois les trois calques montés.
export function runIntro(root: HTMLElement): void {
  const plan = app.settings.mode === 'fullscreen' ? FULL : WINDOW
  const css = getComputedStyle(root)
  const token = (name: string): string => css.getPropertyValue(name).trim().replace(/\s+/g, ' ')
  const out = token('--ease-out')
  const spring = token('--ease-spring')
  const glide = token('--ease-glide')
  const accent = token('--accent')
  const tint = (percent: number): string => `color-mix(in srgb, ${accent} ${percent}%, transparent)`
  const one = (name: string): HTMLElement | null =>
    root.querySelector<HTMLElement>(`[data-intro="${name}"]`)
  const all = (name: string): HTMLElement[] => [
    ...root.querySelectorAll<HTMLElement>(`[data-intro="${name}"]`)
  ]

  // [début, durée] en secondes. fill « both » : état de départ tenu jusqu'au début. Deuxième
  // animation d'une même propriété : « forwards », sinon elle masquerait la première.
  const at = (
    el: Element | null,
    frames: Keyframe[],
    [start, duration]: Span,
    easing: string,
    options: KeyframeAnimationOptions = {}
  ): void => {
    if (!el) return
    const timing = { delay: start * 1000, duration: duration * 1000, easing, fill: 'both' as const }
    running.push(el.animate(frames, { ...timing, ...options }))
  }
  const later = { fill: 'forwards' } as const
  const scaled = { composite: 'add', fill: 'forwards' } as const // échelles qui se multiplient

  const panel = root.querySelector<HTMLElement>('.panel')
  const name = root.querySelector<HTMLElement>('.bar .name')
  const mark = one('mark')
  if (!panel || !name || !mark) return endIntro()

  // Mesures avant toute animation : places finales de l'interface.
  const box = root.getBoundingClientRect()
  const panelBox = panel.getBoundingClientRect()
  const markBox = mark.getBoundingClientRect()
  const nameBox = name.getBoundingClientRect()
  const centerX = box.left + box.width / 2
  const centerOf = (el: Element): { x: number; y: number } => {
    const r = el.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  }
  const bar = panel.querySelector('.bar')
  const headerItems = [...(bar?.children ?? [])].flatMap((el) =>
    el === name
      ? []
      : el.matches('.profiles')
        ? [...el.querySelectorAll('.pill, .tool, .add')]
        : el.matches('.actions')
          ? [...el.children]
          : [el]
  )
  const headerX = headerItems.map((el) => centerOf(el).x)
  const cards = [...panel.querySelectorAll('.grid-stack-item')].map((item) => {
    const c = centerOf(item)
    const distance = Math.hypot(c.x - centerX, c.y - (box.top + 60))
    return { item, start: plan.cards.base + (distance / 500) * plan.cards.spread }
  })
  const gap = box.bottom - panelBox.bottom
  intro.hintTop = plan.panel && gap >= 64 ? panelBox.bottom - box.top + gap / 2 : null

  // Fenêtre (mode fenêtre) : fondu du contenu, Windows anime déjà le cadre.
  if (plan.frame) {
    at(
      root,
      [
        { opacity: 0, transform: 'scale(0.96)' },
        { opacity: 1, transform: 'none' }
      ],
      plan.frame,
      out
    )
  }

  // 1. Lumière : point qui respire, se contracte et éclate ; anneau ; deux lueurs qui s'écartent.
  const { dot: d } = plan
  const dot = one('dot')
  at(
    dot,
    [
      { opacity: 0, transform: 'scale(0)' },
      { opacity: 1, transform: 'scale(1)' }
    ],
    d.appear,
    out
  )
  const breath = [1, 1.07, 1, 0.93, 1].map((s) => ({ transform: `scale(${s})` }))
  at(dot, breath, [d.appear[0], d.burst[0] - d.appear[0]], 'ease-in-out', {
    composite: 'add',
    fill: 'none'
  })
  at(dot, [{ transform: 'scale(1)' }, { transform: 'scale(0.6)' }], d.contract, glide, scaled)
  at(dot, [{ transform: 'scale(1)' }, { transform: 'scale(3.4)' }], d.burst, out, scaled)
  at(dot, [{ opacity: 1 }, { opacity: 0 }], d.burst, out, later)
  at(
    one('ring'),
    [
      { opacity: 0.9, transform: `scale(${d.ring})` },
      { opacity: 0, transform: 'scale(1)' }
    ],
    d.burst,
    out,
    later
  )

  const glowA = one('glow-a')
  const glowB = one('glow-b')
  at(glowA, [{ opacity: 0 }, { opacity: 1 }], plan.glowA.show, out)
  at(glowA, [{ opacity: 1 }, { opacity: plan.glowA.dimTo }], plan.glowA.dim, glide, later)
  at(glowB, [{ opacity: 0 }, { opacity: plan.glowB.to }], plan.glowB.show, glide)
  for (const [glow, [fx, fy]] of [
    [glowA, plan.a],
    [glowB, plan.b]
  ] as const) {
    const grow = [{ transform: `scale(${plan.growFrom})` }, { transform: 'none' }]
    at(glow, grow, plan.grow, out)
    const to = `${(fx - 0.5) * box.width}px ${(fy - 0.5) * box.height}px`
    at(glow, [{ translate: '0 0' }, { translate: to }], plan.split, glide)
  }
  // Puis elles dérivent lentement (±28 px, aller-retour de 6 à 8 s), ajouté au trajet ci-dessus.
  const splitEnd = plan.split[0] + plan.split[1]
  const drift = (el: Element | null, to: string, seconds: number): void => {
    const timing = {
      duration: seconds * 1000,
      iterations: Infinity,
      direction: 'alternate'
    } as const
    at(el, [{ translate: '0 0' }, { translate: to }], [splitEnd, seconds], 'ease-in-out', {
      ...timing,
      composite: 'add',
      fill: 'none'
    })
  }
  drift(glowA, '28px 20px', 7.8)
  drift(glowB, '-28px -24px', 6.3)
  at(one('back'), [{ opacity: 1 }, { opacity: 0 }], plan.fade, glide)

  // 2. Nom : lettres qui montent sur le ressort, passent de l'accent au blanc. « Bienvenue ».
  const L = plan.letters
  all('letter').forEach((letter, i) => {
    const start = L.start + L.step * i
    at(letter, [{ opacity: 0 }, { opacity: 1 }], [start, L.fade], out)
    at(
      letter,
      [{ transform: `translateY(${L.rise}px)` }, { transform: 'none' }],
      [start, L.riseDur],
      spring
    )
    const glow = (pct: number): string => `0 0 ${L.blur}px ${tint(pct)}`
    at(
      letter,
      [
        { color: accent, textShadow: glow(85) },
        { color: token('--text'), textShadow: glow(0) }
      ],
      [start + 0.2, L.lit],
      out
    )
  })
  const W = plan.welcome
  const welcome = one('welcome')
  at(
    welcome,
    [
      { opacity: 0, transform: `translateY(${W.rise}px)` },
      { opacity: 1, transform: 'none' }
    ],
    W.in,
    out
  )
  at(
    welcome,
    [
      { opacity: 1, transform: 'none' },
      { opacity: 0, transform: `translateY(-${W.drop}px)` }
    ],
    W.out,
    out,
    later
  )

  // 3. Le nom rejoint l'en-tête (FLIP), puis le vrai nom de l'en-tête prend le relais.
  const [flipStart, flipDur] = plan.flip
  const flipEnd = flipStart + flipDur
  const word = one('word')
  at(word, [{ transform: 'none' }, { transform: 'scale(1.04)' }], plan.swell, glide)
  at(word, [{ transform: 'scale(1.04)' }, { transform: 'none' }], plan.flip, glide, later)
  const dx = nameBox.left - markBox.left
  const dy = nameBox.top + nameBox.height / 2 - (markBox.top + markBox.height / 2)
  const dock = `translate(${dx}px, ${dy}px) scale(${nameBox.width / markBox.width})`
  at(mark, [{ transform: 'none' }, { transform: dock }], plan.flip, glide)
  at(mark, [{ opacity: 1 }, { opacity: 0 }], [flipEnd, 0.001], 'linear', later)
  at(name, [{ opacity: 0 }, { opacity: 0 }], [0, flipEnd], 'linear', { fill: 'backwards' })

  if (plan.panel) {
    const from = {
      opacity: 0,
      transform: 'translateY(16px) scale(0.965)',
      transformOrigin: '50% 40%'
    }
    at(
      panel,
      [from, { opacity: 1, transform: 'none', transformOrigin: '50% 40%' }],
      plan.panel,
      out
    )
  }
  const sweep = one('sweep')
  if (sweep) {
    const from = `translateX(-${sweep.offsetWidth + 100}px)`
    const to = `translateX(${panelBox.width + 220}px)`
    at(sweep, [{ transform: from }, { transform: to }], plan.sweep, glide)
  }
  headerItems.forEach((el, i) => {
    const start = plan.header + (Math.abs(headerX[i]! - centerX) / 700) * 0.45
    const from = { opacity: 0, transform: 'translateY(8px) scale(0.98)' }
    at(el, [from, { opacity: 1, transform: 'none' }], [start, 0.55], out)
  })

  // 4. Widgets en cascade depuis le haut, avec le halo du survol ; contenus qui partent de zéro.
  for (const { item, start: s } of cards) {
    const content = item.querySelector('.grid-stack-item-content')
    at(content, [{ opacity: 0 }, { opacity: 1 }], [s, 0.45], out)
    const lift = { transform: 'translateY(18px) scale(0.95)' }
    at(content, [lift, { transform: 'none' }], [s, 0.9], spring)
    const card = item.querySelector('.card')
    const halo = { pseudoElement: '::before' }
    at(card, [{ opacity: 0 }, { opacity: 1 }], [s + 0.15, 0.4], out, halo)
    at(card, [{ opacity: 1 }, { opacity: 0 }], [s + 0.6, 1.0], glide, { ...halo, ...later })
    const cs = s + 0.35
    // Horloge : chaque chiffre fait un tour complet (10 crans) avant de se poser ; les
    // deux-points et la date arrivent en fondu.
    const spin = item.querySelector('[data-intro="spin"]')
    spin?.querySelectorAll('.strip').forEach((strip, i) => {
      at(strip, fullTurn(strip as HTMLElement), [cs + 0.1 * i, 1.1], 'linear', { easing: spring })
    })
    spin?.querySelectorAll('.digits > :not(.digit)').forEach((colon) => {
      at(colon, [{ opacity: 0, offset: 0 }], [cs, 0.5], out)
    })
    at(item.querySelector('[data-intro="date"]'), [{ opacity: 0, offset: 0 }], [cs + 0.5, 0.6], out)
    // Une seule image clé (offset 0) : l'arrivée est la vraie valeur affichée par le widget.
    item.querySelectorAll('.strip').forEach((strip, i) => {
      if (spin?.contains(strip)) return
      at(strip, [{ transform: 'translateY(0)', offset: 0 }], [cs + 0.08 * i, 1], spring)
    })
    item.querySelectorAll('.fill').forEach((fill, i) => {
      at(fill, [{ transform: 'scaleX(0)', offset: 0 }], [cs + 0.1 + 0.12 * i, 0.8], out)
    })
    item.querySelectorAll('.tile').forEach((tile, i) => {
      const st = cs + 0.15 + 0.08 * i
      at(tile, [{ opacity: 0, offset: 0 }], [st, 0.35], out)
      at(tile, [{ transform: 'translateY(10px) scale(0.7)', offset: 0 }], [st, 0.7], spring)
    })
  }

  // 5. Raccourci : les touches s'allument une à une, puis remontent ensemble.
  const H = plan.hint
  const hint = one('hint')
  at(
    hint,
    [
      { opacity: 0, transform: `translateY(${H.rise}px)` },
      { opacity: 1, transform: 'none' }
    ],
    H.in,
    out
  )
  at(
    hint,
    [
      { opacity: 1, transform: 'none' },
      { opacity: 0, transform: `translateY(${H.drop}px)` }
    ],
    H.out,
    out,
    later
  )
  all('key').forEach((key, i) => {
    const press: Span = [H.keys + H.step * i, H.press]
    const down = 'translateY(2px) scale(0.96)'
    at(key, [{ transform: 'none' }, { transform: down }], press, out)
    at(key, [{ transform: down }, { transform: 'none' }], H.release, spring, later)
    const glow = key.firstElementChild
    at(glow, [{ opacity: 0 }, { opacity: 1 }], press, out)
    at(glow, [{ opacity: 1 }, { opacity: 0 }], H.release, spring, later)
  })

  endTimer = setTimeout(endIntro, plan.end * 1000)
}
