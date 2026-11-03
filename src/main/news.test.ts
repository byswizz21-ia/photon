import { expect, test, vi } from 'vitest'

vi.mock('electron', () => ({ net: {}, shell: {} }))
vi.mock('./data', () => ({ data: { profile: { widgets: [] } } }))
const { feedUrl, parseRss, parseTopics } = await import('./news')

test('sujets : découpés, doublons retirés, 8 au plus', () => {
  expect(parseTopics(' IA ;Formule  1,\nIA, ')).toEqual(['IA', 'Formule 1'])
  expect(parseTopics('a,b,c,d,e,f,g,h,i')).toHaveLength(8)
  expect(parseTopics(42)).toEqual([])
})

test('sujet → Google Actualités en français, adresse https gardée telle quelle', () => {
  expect(feedUrl('Formule 1')).toBe(
    'https://news.google.com/rss/search?q=Formule%201&hl=fr&gl=FR&ceid=FR:fr'
  )
  expect(feedUrl('https://www.lemonde.fr/rss/une.xml')).toBe('https://www.lemonde.fr/rss/une.xml')
  expect(feedUrl('http://site.fr/rss')).toContain('news.google.com') // http : traité comme un mot-clé
})

test('RSS : titre sans la source, entités, CDATA, liens non https ignorés', () => {
  const xml = `<rss><channel><title>Mon site</title>
    <item><title>L&#8217;IA &amp; nous - Le Point</title><link>https://a.fr/1</link>
      <pubDate>Sun, 01 Nov 2026 18:30:00 GMT</pubDate><source url="https://lepoint.fr">Le Point</source></item>
    <item><title><![CDATA[Sans <b>source</b>]]></title><link>https://a.fr/2</link></item>
    <item><title>Piège</title><link>javascript:alert(1)</link></item>
  </channel></rss>`
  expect(parseRss(xml, 'IA')).toEqual([
    {
      title: 'L’IA & nous',
      link: 'https://a.fr/1',
      source: 'Le Point',
      date: Date.UTC(2026, 10, 1, 18, 30),
      topic: 'IA'
    },
    { title: 'Sans source', link: 'https://a.fr/2', source: 'Mon site', date: 0, topic: 'IA' }
  ])
})
