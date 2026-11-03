import { expect, test, vi } from 'vitest'

vi.mock('electron', () => ({ net: {} }))
vi.mock('./data', () => ({ data: { profile: { widgets: [] } } }))
vi.mock('./window', () => ({ isVisible: () => false }))
const { eta, matchKey, parseEspn, parseLol, parseVlr, pick } = await import('./matches')

// Extraits réduits de vraies réponses (novembre 2026).
const espnFixture = {
  events: [
    {
      id: '401876404',
      date: '2026-11-08T19:45Z',
      league: { abbreviation: 'Ligue 1' },
      links: [{ href: 'https://www.espn.com/soccer/match/_/gameId/401876404/marseille-lens' }],
      competitions: [
        {
          status: { type: { state: 'pre' } },
          competitors: [
            {
              homeAway: 'home',
              team: {
                displayName: 'Lens',
                abbreviation: 'RCL',
                logos: [{ href: 'https://a.espncdn.com/i/teamlogos/soccer/500/175.png' }]
              }
            },
            { homeAway: 'away', team: { displayName: 'Marseille', abbreviation: 'OM' } }
          ]
        }
      ]
    },
    {
      id: '401876480',
      date: '2026-08-30T18:45Z',
      competitions: [
        {
          status: { type: { state: 'post' } },
          competitors: [
            {
              homeAway: 'home',
              score: { value: 2, displayValue: '2' },
              team: { displayName: 'AS Monaco', abbreviation: 'MON' }
            },
            {
              homeAway: 'away',
              score: { value: 0 },
              team: { displayName: 'Marseille', abbreviation: 'OM' }
            }
          ]
        }
      ]
    }
  ]
}

test('ESPN : à venir sans score, résultat avec score, logo réduit', () => {
  const [next, done] = parseEspn(espnFixture)
  expect(next).toMatchObject({
    id: 'espn:401876404',
    state: 'upcoming',
    event: 'Ligue 1',
    home: { name: 'Lens', short: 'RCL', score: null },
    url: 'https://www.espn.com/soccer/match/_/gameId/401876404/marseille-lens'
  })
  expect(next?.home.logoUrl).toBe(
    'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/175.png&w=64&h=64'
  )
  expect(done).toMatchObject({ state: 'done', home: { score: 2 }, away: { score: 0 } })
})

test('lolesports : matchs seulement, état et victoires', () => {
  const json = {
    data: {
      schedule: {
        events: [
          {
            startTime: '2026-11-03T22:00:00Z',
            state: 'unstarted',
            type: 'match',
            blockName: 'Finale',
            league: { name: 'Mondial', slug: 'worlds' },
            match: {
              id: '1',
              teams: [
                {
                  name: 'G2 Esports',
                  code: 'G2',
                  image: 'http://static.lolesports.com/teams/g2.png',
                  result: { gameWins: 0 }
                },
                { name: 'T1', code: 'T1', image: '', result: null }
              ]
            }
          },
          { startTime: '2026-11-03T21:00:00Z', state: 'completed', type: 'show', league: {} }
        ]
      }
    }
  }
  const matches = parseLol(json)
  expect(matches).toHaveLength(1)
  expect(matches[0]).toMatchObject({
    state: 'upcoming',
    event: 'Mondial · Finale',
    home: { short: 'G2', score: null, logoUrl: 'https://static.lolesports.com/teams/g2.png' }
  })
})

const vlrItem = (id: number, status: string, wait: string, a: string, b: string): string => `
<a href="/${id}/match-${id}" class="wf-module-item match-item mod-color mod-bg-after- mod-first">
<div class="match-item-time">
6:00 PM											</div>
<div class="match-item-vs">
<div class="match-item-vs-team ">
<div class="match-item-vs-team-name">
<div class="text-of">
<span class="flag mod-de"></span>
${a}										</div>
</div>
<div class="match-item-vs-team-score mod-upcoming">
${status === 'Completed' ? '2' : '&ndash;'}
</div>
</div>
<div class="match-item-vs-team ">
<div class="match-item-vs-team-name">
<div class="text-of">
<span class="flag mod-fr"></span>
${b}										</div>
</div>
<div class="match-item-vs-team-score mod-upcoming">
${status === 'Completed' ? '1' : '&ndash;'}
</div>
</div>
</div>
<div class="match-item-eta">
<div class="ml">
<div class="ml-status">${status}</div>
<div class="ml-eta">${wait}</div>
</div>
</div>
<div class="match-item-event text-of">
<div class="match-item-event-series text-of">
Group Stage&ndash;Round 3							</div>
Spike Series 2026											</div>
<div class="match-item-icon">
<img src="//owcdn.net/img/6addd595dc0f2.png">
</div>
</a>`

test('vlr.gg : équipes, statut, compétition, heure vérifiée par le délai', () => {
  const now = new Date(2026, 10, 3, 13, 10).getTime()
  const html = `<div class="wf-label mod-large">
			Wed, November 4, 2026
					</div>${vlrItem(772824, 'Upcoming', '1d 4h', 'Eintracht Frankfurt', 'Karmine Corp')}`
  const [m] = parseVlr(html, now)
  expect(m).toMatchObject({
    id: 'vlr:772824',
    state: 'upcoming',
    home: { name: 'Eintracht Frankfurt', score: null },
    away: { name: 'Karmine Corp' },
    event: 'Spike Series 2026 · Group Stage–Round 3',
    url: 'https://www.vlr.gg/772824/match-772824'
  })
  expect(m?.start).toBe(new Date(2026, 10, 4, 18, 0).getTime()) // heure affichée, cohérente
  // Délai incohérent avec l'heure (fuseau mal deviné) : on garde le délai.
  const [far] = parseVlr(html.replace('1d 4h', '2h 0m'), now)
  expect(far?.start).toBe(now + 2 * 3_600_000)
  const [done] = parseVlr(vlrItem(1, 'Completed', '1d 18h', 'A', 'B'), now)
  expect(done).toMatchObject({ state: 'done', home: { score: 2 }, away: { score: 1 } })
})

test('délais vlr.gg', () => {
  expect(eta('1w 3d')).toBe(10 * 86_400_000)
  expect(eta('5d 4h')).toBe(5 * 86_400_000 + 4 * 3_600_000)
  expect(eta('23m')).toBe(23 * 60_000)
  expect(eta('')).toBeNull()
})

test('tri : direct, puis à venir, puis derniers résultats ; filtre', () => {
  const m = (id: string, state: 'upcoming' | 'live' | 'done', start: number, home = 'G2') => ({
    id,
    start,
    state,
    home: { name: home, short: '', logoUrl: '', score: null },
    away: { name: 'T1', short: '', logoUrl: '', score: null },
    event: 'LEC',
    url: ''
  })
  const all = [
    m('a', 'done', 1),
    m('b', 'upcoming', 5),
    m('c', 'live', 3),
    m('d', 'upcoming', 4, 'FNC'),
    m('e', 'done', 2)
  ]
  expect(pick(all, '').map((x) => x.id)).toEqual(['c', 'd', 'b', 'e', 'a'])
  expect(pick(all, 'fnc, karmine').map((x) => x.id)).toEqual(['d'])
})

test('clé de lecture selon les réglages', () => {
  expect(matchKey({ sport: 'foot', league: 'fra.1', team: '176' })).toBe('foot|fra.1|176')
  expect(matchKey({ sport: 'foot', league: '../x' })).toBeNull()
  expect(matchKey({ sport: 'lol', filter: ' G2|x ' })).toBe('lol|G2 x')
  expect(matchKey({ sport: 'tennis' })).toBeNull()
})
