// Icône de la zone de notification et son menu (afficher, mode, toujours au-dessus, quitter).
import { Menu, Tray, nativeTheme } from 'electron'
import trayOnDark from '../../assets/tray-dark.ico?asset'
import trayOnLight from '../../assets/tray-light.ico?asset'
import { shortcutLabel, type Settings } from '../shared/model'
import { data } from './data'

interface TrayActions {
  toggle: () => void
  update: (patch: Partial<Settings>) => void
  quit: () => void
}

let tray: Tray
let actions: TrayActions

// Icône claire sur barre des tâches sombre, foncée sur barre claire.
const icon = (): string =>
  nativeTheme.shouldUseDarkColorsForSystemIntegratedUI ? trayOnDark : trayOnLight

export function createTray(trayActions: TrayActions, shortcut: string | null): void {
  actions = trayActions
  tray = new Tray(icon())
  tray.setToolTip('Photon')
  tray.on('click', actions.toggle)
  nativeTheme.on('updated', () => tray.setImage(icon()))
  refreshTray(shortcut)
}

export function refreshTray(shortcut: string | null): void {
  const { mode, alwaysOnTop } = data.settings
  const show = shortcut ? `Afficher Photon (${shortcutLabel(shortcut)})` : 'Afficher Photon'
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: show, click: actions.toggle },
      { type: 'separator' },
      {
        label: 'Plein écran',
        type: 'radio',
        checked: mode === 'fullscreen',
        click: () => actions.update({ mode: 'fullscreen' })
      },
      {
        label: 'Fenêtre',
        type: 'radio',
        checked: mode === 'window',
        click: () => actions.update({ mode: 'window' })
      },
      {
        label: 'Toujours au-dessus',
        type: 'checkbox',
        checked: alwaysOnTop,
        enabled: mode === 'window',
        click: (item) => actions.update({ alwaysOnTop: item.checked })
      },
      { type: 'separator' },
      { label: 'Quitter', click: actions.quit }
    ])
  )
}
