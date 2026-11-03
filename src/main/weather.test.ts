import { expect, test, vi } from 'vitest'

vi.mock('electron', () => ({ net: {} }))
vi.mock('./data', () => ({ data: { profile: { widgets: [] } } }))

const { parseForecast } = await import('./weather')

test('prévisions : heure locale de la ville, champs abîmés ignorés', () => {
  const feed = parseForecast(
    {
      utc_offset_seconds: 3600, // Paris en hiver
      current: {
        temperature_2m: 9.4,
        weather_code: 2,
        is_day: 1,
        apparent_temperature: 7.1,
        relative_humidity_2m: 72,
        wind_speed_10m: 14,
        wind_direction_10m: 225
      },
      hourly: {
        time: ['2026-11-03T14:00', '2026-11-03T15:00', 'abîmé'],
        temperature_2m: [10, 11, 12],
        weather_code: [2, 61, 3],
        is_day: [1, 0, 1],
        precipitation_probability: [10, null, 5]
      },
      daily: {
        time: ['2026-11-03'],
        weather_code: [2],
        temperature_2m_max: [14],
        temperature_2m_min: [7],
        sunrise: ['2026-11-03T07:32'],
        sunset: ['2026-11-03T17:18'],
        uv_index_max: [2.1]
      }
    },
    'Lyon'
  )
  expect(feed.current).toMatchObject({ temperature: 9.4, feels: 7.1, windFrom: 225, gusts: null })
  expect(feed.hours).toEqual([
    { time: Date.UTC(2026, 10, 3, 13), temperature: 10, code: 2, day: true, rain: 10 },
    { time: Date.UTC(2026, 10, 3, 14), temperature: 11, code: 61, day: false, rain: null }
  ])
  expect(feed.days[0]).toMatchObject({
    sunrise: Date.UTC(2026, 10, 3, 6, 32),
    sunset: Date.UTC(2026, 10, 3, 16, 18),
    uv: 2.1,
    rain: null
  })
  expect(parseForecast({}, 'Lyon')).toEqual({ place: 'Lyon', current: null, hours: [], days: [] })
})
