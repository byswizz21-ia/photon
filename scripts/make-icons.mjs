// Script ponctuel : génère le logo « point en orbite » (SVG, PNG, .ico) dans assets/.
// Lancer depuis Windows : npm run icons. Aucune dépendance : Electron dessine, les .ico sont écrits à la main.
import { app, BrowserWindow } from 'electron'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT = join(import.meta.dirname, '../assets')
const ACCENT = '#7CC4FF'
const INK_LIGHT = '#F3F4F6'
const INK_DARK = '#141414'

// Grand : arc fin + point lumineux. 20 px et moins : arc épais, point plus gros, sans lueur.
function logo(px, ink, dot) {
  if (px <= 20) {
    return (
      `<path d="M51.1 26.1 A20 20 0 1 1 37.9 12.9" fill="none" stroke="${ink}" stroke-width="6.5" stroke-linecap="round" opacity="0.7"/>` +
      `<circle cx="46.14" cy="17.86" r="9.5" fill="${dot}"/>`
    )
  }
  // Lueur = drop-shadow de size/10 px dans la maquette, soit un écart-type constant de 3.2 unités.
  return (
    `<defs><filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="0" stdDeviation="3.2" flood-color="${dot}"/></filter></defs>` +
    `<path d="M50.13 23.55 A20 20 0 1 1 40.45 13.87" fill="none" stroke="${ink}" stroke-width="3.5" stroke-linecap="round" opacity="0.6"/>` +
    `<circle cx="46.14" cy="17.86" r="7" fill="${dot}" filter="url(#glow)"/>`
  )
}

const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${body}</svg>`

// Icône d'app : tuile sombre arrondie, logo à 60 % de la tuile.
const appIcon = (size) =>
  svg(
    `<rect x="0.5" y="0.5" width="63" height="63" rx="16" fill="#0E1015" stroke="rgba(255,255,255,0.1)"/>` +
      `<g transform="translate(12.8 12.8) scale(0.6)">${logo(size * 0.6, INK_LIGHT, ACCENT)}</g>`
  )
// Zone de notification : fond transparent ; barre claire → version mono foncée (maquette « Mono clair »).
const trayOnDark = (size) => svg(logo(size, INK_LIGHT, ACCENT))
const trayOnLight = (size) => svg(logo(size, INK_DARK, INK_DARK))

// Rend chaque SVG à la taille exacte dans un canvas ; renvoie PNG (data URL) + pixels RGBA.
async function rasterize(win, jobs) {
  return win.webContents
    .executeJavaScript(`Promise.all(${JSON.stringify(jobs)}.map(async ({ svg, size }) => {
    const img = new Image()
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
    await img.decode()
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0, size, size)
    return { size, png: canvas.toDataURL('image/png'), rgba: Array.from(ctx.getImageData(0, 0, size, size).data) }
  }))`)
}

const pngBuffer = (dataUrl) => Buffer.from(dataUrl.split(',')[1], 'base64')

// Entrée .ico au format BMP 32 bits (lignes de bas en haut, BGRA) : lue partout, même par NSIS.
function bmpEntry(size, rgba) {
  const header = Buffer.alloc(40)
  header.writeUInt32LE(40, 0)
  header.writeInt32LE(size, 4)
  header.writeInt32LE(size * 2, 8) // hauteur doublée : image + masque
  header.writeUInt16LE(1, 12)
  header.writeUInt16LE(32, 14)
  const pixels = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const src = (y * size + x) * 4
      const dst = ((size - 1 - y) * size + x) * 4
      pixels[dst] = rgba[src + 2]
      pixels[dst + 1] = rgba[src + 1]
      pixels[dst + 2] = rgba[src]
      pixels[dst + 3] = rgba[src + 3]
    }
  }
  const mask = Buffer.alloc(Math.ceil(size / 32) * 4 * size) // à zéro : l'alpha fait foi
  return Buffer.concat([header, pixels, mask])
}

function ico(images) {
  const entries = images.map(({ size, png, rgba }) => ({
    size,
    data: size >= 256 ? pngBuffer(png) : bmpEntry(size, rgba)
  }))
  const header = Buffer.alloc(6)
  header.writeUInt16LE(1, 2) // type icône
  header.writeUInt16LE(entries.length, 4)
  const directory = Buffer.alloc(16 * entries.length)
  let offset = header.length + directory.length
  entries.forEach(({ size, data }, i) => {
    const o = i * 16
    directory.writeUInt8(size >= 256 ? 0 : size, o)
    directory.writeUInt8(size >= 256 ? 0 : size, o + 1)
    directory.writeUInt16LE(1, o + 4)
    directory.writeUInt16LE(32, o + 6)
    directory.writeUInt32LE(data.length, o + 8)
    directory.writeUInt32LE(offset, o + 12)
    offset += data.length
  })
  return Buffer.concat([header, directory, ...entries.map((e) => e.data)])
}

const jobs = (make, sizes) => sizes.map((size) => ({ size, svg: make(size) }))

app
  .whenReady()
  .then(async () => {
    const win = new BrowserWindow({ show: false })
    await win.loadURL('about:blank')
    const appImages = await rasterize(win, jobs(appIcon, [16, 32, 48, 256]))
    const traySizes = [16, 20, 24, 32, 48] // 20 et 24 : nets à 125 % et 150 % d'échelle
    writeFileSync(join(OUT, 'logo.svg'), trayOnDark(64))
    writeFileSync(join(OUT, 'icon.png'), pngBuffer(appImages.at(-1).png))
    writeFileSync(join(OUT, 'icon.ico'), ico(appImages))
    writeFileSync(
      join(OUT, 'tray-dark.ico'),
      ico(await rasterize(win, jobs(trayOnDark, traySizes)))
    )
    writeFileSync(
      join(OUT, 'tray-light.ico'),
      ico(await rasterize(win, jobs(trayOnLight, traySizes)))
    )
    console.log('Icônes écrites dans assets/')
    app.quit()
  })
  .catch((error) => {
    console.error(error)
    app.exit(1)
  })
