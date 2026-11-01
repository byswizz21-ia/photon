import { afterAll, expect, test, vi } from 'vitest'

const shown: string[] = []
vi.mock('electron', () => ({
  Notification: class {
    static isSupported = (): boolean => true
    constructor(private options: { title: string }) {}
    on(): void {}
    show(): void {
      shown.push(this.options.title)
    }
  }
}))
vi.mock('./window', () => ({ showWindow: () => {} }))
vi.useFakeTimers()
afterAll(() => vi.useRealTimers())

const { pomodoro, pomodoroControl } = await import('./pomodoro')
const MINUTE = 60_000

test('travail, pause en cours, reprise, pause auto puis fin', () => {
  expect(pomodoroControl('start', 2, 1)).toMatchObject({
    phase: 'focus',
    running: true,
    total: 2 * MINUTE
  })
  vi.advanceTimersByTime(MINUTE)
  expect(pomodoroControl('pause')).toMatchObject({ running: false, left: MINUTE })
  vi.advanceTimersByTime(10 * MINUTE) // en pause : rien ne bouge
  expect(pomodoro()).toMatchObject({ phase: 'focus', left: MINUTE })
  pomodoroControl('start') // reprise, pas un nouveau pomodoro
  vi.advanceTimersByTime(MINUTE)
  expect(pomodoro()).toMatchObject({ phase: 'pause', running: true, total: MINUTE })
  vi.advanceTimersByTime(MINUTE)
  expect(pomodoro().phase).toBe('idle')
  expect(shown).toEqual(['Pause !', 'Pause terminée'])
})

test('durées bornées, la barre reprend les dernières durées', () => {
  expect(pomodoroControl('start', -5, 9999)).toMatchObject({ total: MINUTE })
  pomodoroControl('reset')
  expect(pomodoroControl('start')).toMatchObject({ total: MINUTE }) // dernière durée choisie
  expect(pomodoroControl('skip')).toMatchObject({ phase: 'pause', total: 180 * MINUTE })
  expect(pomodoroControl('reset').phase).toBe('idle')
})
