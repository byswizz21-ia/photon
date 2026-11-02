import { expect, test, vi } from 'vitest'

vi.mock('electron', () => ({ app: {}, dialog: {}, net: {}, protocol: {} }))
vi.mock('./data', () => ({ data: {} }))
vi.mock('./window', () => ({ withModal: vi.fn() }))
const { giphyMedia, httpsUrl, pageMedia } = await import('./download')

test('liens : https seulement', () => {
  expect(httpsUrl(' https://tenor.com/view/cat-gif-1 ')).toBe('https://tenor.com/view/cat-gif-1')
  expect(httpsUrl('http://tenor.com/x.gif')).toBeNull()
  expect(httpsUrl('file:///C:/Windows/win.ini')).toBeNull()
  expect(httpsUrl('photon://images/a.gif')).toBeNull()
  expect(httpsUrl(42)).toBeNull()
})

test('page Tenor : la vidéo plutôt que la petite image', () => {
  const html = `<meta class="dynamic" property="og:image" content="https://media.tenor.com/a/cat.gif">
    <meta class="dynamic" property="og:video" content="https://media.tenor.com/b/cat.mp4">`
  expect(pageMedia(html, 'https://tenor.com/view/x')).toBe('https://media.tenor.com/b/cat.mp4')
})

test('page Giphy : og:image, attributs dans le désordre, &amp; décodé', () => {
  const html = `<meta content="https://media4.giphy.com/media/v1.Y2?a=1&amp;b=2/giphy.webp" property="og:image"/>`
  expect(pageMedia(html, 'https://giphy.com/gifs/x')).toBe(
    'https://media4.giphy.com/media/v1.Y2?a=1&b=2/giphy.webp'
  )
})

test('page sans média, ou média non https : rien', () => {
  expect(pageMedia('<meta property="og:title" content="Chat">', 'https://a.fr')).toBeNull()
  expect(
    pageMedia('<meta property="og:image" content="http://a.fr/x.gif">', 'https://a.fr')
  ).toBeNull()
  expect(pageMedia('<meta property="og:image" content="/x.gif">', 'https://a.fr/p')).toBe(
    'https://a.fr/x.gif'
  )
})

test("Giphy : mp4 tiré de l'identifiant, quel que soit le lien de page", () => {
  const mp4 = 'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.mp4'
  expect(giphyMedia('https://giphy.com/gifs/cat-funny-JIX9t2j0ZTN9S')).toBe(mp4)
  expect(giphyMedia('https://giphy.com/gifs/JIX9t2j0ZTN9S')).toBe(mp4)
  expect(giphyMedia('https://giphy.com/embed/JIX9t2j0ZTN9S')).toBe(mp4)
  expect(giphyMedia('https://giphy.com/explore/cat')).toBeNull()
  expect(giphyMedia('https://evil.com/giphy.com/gifs/x-1')).toBeNull()
})
