# Photon

Une fenêtre de verre qui s'ouvre d'un raccourci (Win+Alt+Espace par défaut) et remplace le bureau :
une grille de widgets à disposer soi-même. Electron + Svelte 5 + TypeScript + gridstack.js.

Design doc (source de vérité) : https://claude.ai/artifact/PozosXRE6sFL3Cmswz6uB1

## Lancer

Toujours depuis Windows (PowerShell ou terminal VS Code Windows), jamais depuis WSL :

```powershell
npm install
npm run dev        # lance Photon avec rechargement à chaud
npm run dist       # construit l'installateur .exe dans dist/
```

Vérifications à garder au vert : `npm run typecheck`, `npm run lint`, `npm test`.

## Où sont les données

Dans `%APPDATA%\Photon\`, en JSON lisible et modifiable à la main :

- `settings.json` : raccourci, mode (plein écran / fenêtre), profil actif, thème global
- `themes/default.json` : fond, accent, flou, opacité, arrondi, densité
- `profiles/<id>.json` : un fichier par profil (nom, widgets : type, position, taille, réglages) ; un profil supprimé devient `<id>.json.deleted`
- `data/<clé>.json` : données partagées entre profils (notes, to-do), lues par `lib/shared.svelte.ts`

Chaque fichier est écrit de façon atomique avec une copie `.bak`. Un fichier abîmé est remplacé par
sa copie, puis par les valeurs par défaut. Les fichiers sont créés au premier changement.

## Créer un widget

Un widget = un dossier dans `src/renderer/widgets/`. Photon le découvre tout seul au démarrage :
rien d'autre à modifier.

1. Copie `src/renderer/widgets/_template/` vers `src/renderer/widgets/meteo/` (le nom du dossier
   devient le type du widget dans le profil).
2. Dans `manifest.ts`, décris le widget :

   ```ts
   import SunIcon from 'phosphor-svelte/lib/SunIcon'
   import type { WidgetManifest } from '../types'
   import Weather from './Weather.svelte'

   export type WeatherSettings = { city: string }

   const manifest: WidgetManifest<WeatherSettings> = {
     name: 'Météo', // nom dans le menu « Ajouter »
     icon: SunIcon, // icône Phosphor (import par chemin, suffixe Icon)
     size: { w: 3, h: 2, minW: 2, minH: 2 }, // en cases ; la grille a 12 colonnes
     defaults: { city: 'Paris' }, // réglages d'une nouvelle instance
     component: Weather
   }

   export default manifest
   ```

3. Dans le composant, reçois tes réglages :

   ```svelte
   <script lang="ts">
     import type { WidgetProps } from '../types'
     import type { WeatherSettings } from './manifest'

     let { settings, editing, save }: WidgetProps<WeatherSettings> = $props()
   </script>
   ```

   - `settings` : les réglages de cette instance (valeurs par défaut si absents ou abîmés).
   - `editing` : vrai en mode édition ; montre alors tes réglages.
   - `save(nouveauxRéglages)` : enregistre les réglages dans le profil.

4. Pour lire le système, passe par `window.photon` (liste dans `src/shared/api.ts`) et rafraîchis
   seulement quand Photon est affiché :

   ```ts
   import { pollWhileVisible } from '../../lib/poll.svelte'

   let cpu = $state(0)
   pollWhileVisible(async () => {
     cpu = (await window.photon.cpuRam()).cpu
   }, 2000)
   ```

Règles : la carte de verre, le survol et la gestion des pannes sont fournis par Photon (un widget qui
plante affiche une erreur dans sa case seulement). Anime uniquement `transform` et `opacity`. Pour un
chiffre qui change, utilise `lib/RollingNumber.svelte` (les chiffres défilent). Dimensionne le
contenu sur la carte avec les unités `cqw` / `cqh`.

## Crédits

- Police [Satoshi](https://www.fontshare.com/fonts/satoshi) (Indian Type Foundry), licence ITF Free
  Font License : intégrée telle quelle, à ne pas modifier ni redistribuer seule.
- Icônes [Phosphor](https://phosphoricons.com) (MIT).
