import { expect, test } from 'vitest'
import { parseLine, summarize } from './usage'

const H = 3_600_000

test('ligne de journal : tokens comptés, cache lu ignoré, autres lignes refusées', () => {
  const line = JSON.stringify({
    type: 'assistant',
    timestamp: '2026-11-01T20:04:34.882Z',
    requestId: 'req_1',
    message: {
      id: 'msg_1',
      usage: {
        input_tokens: 2,
        output_tokens: 300,
        cache_creation_input_tokens: 700,
        cache_read_input_tokens: 170_000
      }
    }
  })
  expect(parseLine(line)).toEqual([
    'msg_1:req_1',
    { time: Date.parse('2026-11-01T20:04:34.882Z'), tokens: 1002 }
  ])
  expect(parseLine('{"type":"user","message":{"usage":{}}}')).toBeNull()
  expect(parseLine('{"usage" pas du json')).toBeNull()
})

test('fenêtre de 5 h arrondie à l’heure, jour et semaine', () => {
  const now = new Date(2026, 10, 1, 21, 30).getTime()
  const at = (h: number, m = 0): number => new Date(2026, 10, 1, h, m).getTime()
  const usage = summarize(
    [
      { time: now - 8 * 86_400_000, tokens: 999 }, // hors semaine
      { time: at(9, 10), tokens: 10 }, // fenêtre 9 h → 14 h, finie
      { time: at(13, 50), tokens: 20 },
      { time: at(17, 40), tokens: 30 }, // nouvelle fenêtre 17 h → 22 h
      { time: at(21, 0), tokens: 40 }
    ],
    now
  )
  expect(usage).toEqual({
    session: 70,
    messages: 2,
    resetsAt: at(22),
    today: 100,
    week: 100
  })
  expect(summarize([{ time: now - 6 * H, tokens: 5 }], now).resetsAt).toBeNull()
})
