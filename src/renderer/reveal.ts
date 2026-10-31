// Révélation lumineuse à l'ouverture : un cercle de lumière part du curseur et dévoile les
// éléments [data-reveal] en cascade, du plus proche au plus loin. transform/opacity, < 300 ms.
const EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)'

export function reveal(root: HTMLElement, origin: { x: number; y: number }): void {
  const { x, y } = origin
  root.querySelector('.light')?.animate(
    [
      { transform: `translate(${x}px, ${y}px) scale(0.2)`, opacity: 0.9 },
      { transform: `translate(${x}px, ${y}px) scale(4)`, opacity: 0 }
    ],
    { duration: 280, easing: EASE }
  )
  root.querySelector('.backdrop')?.animate([{ opacity: 0 }, { opacity: 1 }], {
    duration: 160,
    easing: 'ease-out'
  })
  for (const el of root.querySelectorAll<HTMLElement>('[data-reveal]')) {
    const box = el.getBoundingClientRect()
    const distance = Math.hypot(box.x + box.width / 2 - x, box.y + box.height / 2 - y)
    el.animate(
      [
        { opacity: 0, transform: 'translateY(8px) scale(0.98)' },
        { opacity: 1, transform: 'none' }
      ],
      { duration: 180, delay: Math.min(100, distance / 12), easing: EASE, fill: 'backwards' }
    )
  }
}
