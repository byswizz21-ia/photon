// Icône de la zone de notification et son menu.
import { Menu, Tray, nativeTheme } from 'electron'
import trayOnDark from '../../assets/tray-dark.ico?asset'
import trayOnLight from '../../assets/tray-light.ico?asset'

interface TrayActions {
  toggle: () => void
  quit: () => void
}

let tray: Tray

// Icône claire sur barre des tâches sombre, foncée sur barre claire.
const icon = (): string =>
  nativeTheme.shouldUseDarkColorsForSystemIntegratedUI ? trayOnDark : trayOnLight

export function createTray(actions: TrayActions): void {
  tray = new Tray(icon())
  tray.setToolTip('Photon')
  tray.on('click', actions.toggle)
  nativeTheme.on('updated', () => tray.setImage(icon()))
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Afficher Photon', click: actions.toggle },
      { type: 'separator' },
      { label: 'Quitter', click: actions.quit }
    ])
  )
}
