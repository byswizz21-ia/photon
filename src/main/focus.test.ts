import { expect, test, vi } from 'vitest'

// Faux outil natif : « Ne pas déranger » simulé, aucune commande n'atteint Windows.
let dnd = 'Microsoft.QuietHoursProfile.Unrestricted'
const sent: string[] = []
vi.mock('./native', () => ({
  nativeTool: () => ({
    send: async (command: string) => {
      sent.push(command)
      if (command === 'get') return dnd
      dnd = command.slice(4)
      return 'ok'
    }
  })
}))
let phase = 'idle'
const reminders: boolean[] = []
vi.mock('./pomodoro', () => ({
  pomodoro: () => ({ phase }),
  pomodoroControl: (command: string) => {
    if (command === 'start') phase = 'focus'
  },
  setReminders: (on: boolean) => reminders.push(on)
}))

const { syncFocus } = await import('./focus')

test('Focus : DND activé puis rendu, pomodoro lancé une fois', async () => {
  await syncFocus(true)
  expect(dnd).toBe('Microsoft.QuietHoursProfile.PriorityOnly')
  expect(phase).toBe('focus')
  await syncFocus(true) // déjà actif : rien
  await syncFocus(false)
  expect(dnd).toBe('Microsoft.QuietHoursProfile.Unrestricted')
  expect(reminders).toEqual([true, false])
  expect(sent).toHaveLength(3) // get, set PriorityOnly, set Unrestricted
})

test('DND déjà actif avant le Focus : laissé tel quel en sortant', async () => {
  dnd = 'Microsoft.QuietHoursProfile.PriorityOnly'
  sent.length = 0
  syncFocus(true)
  await syncFocus(false) // bascules rapides : appliquées dans l'ordre
  expect(sent).toEqual(['get'])
  expect(dnd).toBe('Microsoft.QuietHoursProfile.PriorityOnly')
})
