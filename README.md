<div align="center">

<img src="assets/logo.svg" alt="" width="88" />

# Photon

**Une fenêtre de verre pleine de widgets, à un raccourci de distance.**

Windows 10 / 11 · Electron · Svelte 5 · TypeScript · gridstack.js

</div>

---

Photon s'ouvre d'un raccourci (**Win+Alt+Espace** par défaut) par-dessus tout le reste et remplace le
bureau : une grille de widgets que tu disposes toi-même, sur un panneau de verre flouté. Il est
créé au démarrage puis seulement affiché ou caché : l'ouverture est instantanée.

## Ce qu'il fait

- **Grille libre** : déplace, redimensionne, ajoute ou retire des widgets (crayon en haut à droite).
- **Barre de commande** : **Alt+Espace** ouvre la barre seule. Elle lance une app ou un fichier ; tape
  `>` pour les commandes (son, musique, pomodoro, mise en veille…).
- **Profils** : une disposition par usage (Travail, Chill, Gaming, Focus, Minimal ou vierge),
  avec bascule automatique au lancement d'une app ou selon l'heure. Un profil Focus active « Ne pas
  déranger » et le pomodoro.
- **Thèmes** : fond d'écran, image, dégradé ou scène lumineuse ; accent extrait du fond ; flou,
  opacité, arrondi (tous les coins le suivent), densité et police réglables, par profil ou pour
  tous.
- **Sons** : sound design discret, sept ambiances au choix (Réglages › Sons), réglable ou coupé.
- **Menu « Ajouter »** : widgets par rubrique, recherche, et catalogue avec aperçu en direct.
- **Plein écran ou fenêtre**, au choix de l'écran, avec flou en direct en mode fenêtre.
- **Animation d'ouverture** à la toute première ouverture (passable d'un clic ou d'une touche,
  à revoir dans Réglages › Général).

## Widgets

| Catégorie     | Widgets                                                                                                                                                     |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Système       | Système, Disques, Réseau, Processus, Batteries, Son, Ports, Anti-veille, Minuteur d'arrêt, Corbeille, Test micro                                            |
| Organisation  | Horloge, Fuseaux horaires, Agenda, Compte à rebours, Jours fériés, To-do, Notes, Habitudes, Anniversaires, Abonnements, Budget du mois                      |
| Concentration | Pomodoro, Suivi du temps, Pause des yeux                                                                                                                    |
| Musique       | Spotify, Deezer, SoundCloud, YT Music : design sobre ou « Adapté » au service, volume                                                                       |
| Raccourcis    | Lanceur, Dossiers, Presse-papiers, Projets Git, Outils dev, Pipette, Scripts, Captures récentes, Traduction, Tirage au sort                                 |
| Infos         | Météo, Cours (bourse et crypto), Claude, Usage Claude, Micro-entreprise, Moyenne, Bus et tram (Divia), Matchs (foot, LoL, Valorant), Jeux gratuits, Sorties |
| Décor         | Image, GIF, Vidéo                                                                                                                                           |

Nouveautés de chaque version : [CHANGELOG.md](CHANGELOG.md).

## Installer

Lance `Photon-Setup-<version>.exe` (construit avec `npm run dist`, voir plus bas). Photon s'ouvre
une première fois, puis reste dans la zone de notification : rouvre-le avec le raccourci.

## Développer

Toutes les commandes se lancent **depuis Windows** (PowerShell ou terminal VS Code Windows), jamais
depuis WSL : `npm install` y installerait les binaires Linux d'Electron.

```powershell
npm install
npm run dev        # Photon avec rechargement à chaud
npm run dist       # installateur dist/Photon-Setup-<version>.exe
```

Avant chaque commit : `npm run typecheck`, `npm run lint` et `npm test` au vert.

```
src/
├─ main/       processus principal : fenêtre, raccourcis, fichiers, accès à Windows
├─ preload/    pont window.photon, seule porte entre l'interface et Windows
├─ shared/     modèle des données (validation, versions) et contrat de window.photon
└─ renderer/   interface Svelte : grille, barre, profils, thèmes, widgets/
```

Sécurité : `contextIsolation` et `sandbox` actifs, pas de `nodeIntegration`. L'interface ne parle
à Windows que via `window.photon` (`src/shared/api.ts`).

## Où sont tes données

Dans `%APPDATA%\Photon\`, en JSON lisible et modifiable à la main :

| Fichier              | Contenu                                                                        |
| -------------------- | ------------------------------------------------------------------------------ |
| `settings.json`      | raccourcis, mode, écran, profil actif, thème global                            |
| `themes/<nom>.json`  | fond, accent, flou, opacité, arrondi, densité, police                          |
| `profiles/<id>.json` | un profil : nom, règles, widgets (type, position, taille, réglages)            |
| `data/<clé>.json`    | données partagées (notes, to-do…) ; `<clé>-<profil>.json` si propres au profil |

Chaque fichier est écrit de façon atomique avec une copie `.bak`. Un fichier abîmé est remplacé par
sa copie, puis par les valeurs par défaut ; avant d'être réécrit, il est mis de côté en
`.broken-<date>`. Un profil supprimé devient `<id>.json.deleted`.

### Mises à jour sans casse

Les profils portent un numéro de format (`version`). À la lecture, Photon applique les conversions
qui manquent (`MIGRATIONS` dans `src/shared/model.ts`) ; tout champ absent prend sa valeur par
défaut. Ce qu'une version ne connaît pas est gardé tel quel : un widget retiré reste dans le profil
(invisible) et revient s'il est réinstallé, un réglage ou un champ d'une version plus récente
survit à un retour en arrière.

Pour un widget publié, ne renomme ni son dossier ni ses clés de réglage sans ajouter une étape de
conversion (avec test).

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
     category: 'info', // rubrique du menu et du catalogue (liste : CATEGORIES dans widgets/types.ts)
     description: 'Température et prévisions de la ville choisie.', // une phrase : ce qu'il fait
     icon: SunIcon, // icône Phosphor (import par chemin, suffixe Icon)
     size: { w: 3, h: 2, minW: 2, minH: 2 }, // en cases ; la grille a 12 colonnes
     defaults: { city: 'Paris' }, // réglages d'une nouvelle instance
     component: Weather
   }

   export default manifest
   ```

   Optionnel : `minSize(settings)` renvoie la place minimale du contenu en px selon les réglages
   (ou `null`). La grille la convertit en cases, agrandit la carte quand le réglage change et
   empêche de la réduire en dessous. Exemple : le design « Adapté » des lecteurs de musique.

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
   - `preview` : vrai dans l'aperçu du catalogue (« Voir tous les widgets »). Le widget y tourne
     avec ses réglages par défaut et des vraies données, sans clic possible. S'il envoie un réglage
     à Photon dès le montage (comme « Pause des yeux »), il ne doit pas le faire en aperçu.

4. Pour lire le système, passe par `window.photon` (liste dans `src/shared/api.ts`) et rafraîchis
   seulement quand Photon est affiché :

   ```ts
   import { pollWhileVisible } from '../../lib/poll.svelte'

   let cpu = $state(0)
   pollWhileVisible(async () => {
     cpu = (await window.photon.cpuRam()).cpu
   }, 2000)
   ```

5. Pour prévenir par une notification Windows : un rappel daté (à partir des réglages du widget)
   s'ajoute dans `dueReminders` (`src/main/reminders.ts`, vérifié chaque minute, testé) ; un
   événement tenu par Photon (fin de minuteur…) appelle `notify(source, { title, body })` de
   `src/main/notify.ts`. Dans les deux cas, déclare la source dans `NOTIFY_SOURCES`
   (`src/shared/model.ts`) : elle apparaît dans Réglages › Notifications pour être coupée.

Règles : la carte de verre, le survol et la gestion des pannes sont fournis par Photon (un widget qui
plante affiche une erreur dans sa case seulement). Anime uniquement `transform` et `opacity`. Pour un
chiffre qui change, utilise `lib/RollingNumber.svelte`. Dimensionne le contenu sur la carte avec
les unités `cqw` / `cqh`. Couleurs, rayons, ombres, tailles et durées : tokens de
`src/renderer/tokens.css`, jamais en dur.

## Crédits

- Police [Satoshi](https://www.fontshare.com/fonts/satoshi) (Indian Type Foundry), licence ITF Free
  Font License : intégrée telle quelle, à ne pas modifier ni redistribuer seule.
- Icônes [Phosphor](https://phosphoricons.com) (MIT).
- Sons des ambiances Onde, Piano et Industriel : kits [SND](https://snd.dev) de Dentsu (Yasuhiro
  Tsuchiya, Ayako Taniguchi…), gratuits pour un usage commercial ou non. Ils ne doivent être ni
  redistribués seuls ni utilisés comme logo sonore. Ici, ils sont découpés et normalisés.
- Sons de l'ambiance Tactile : [Kenney](https://kenney.nl/assets/interface-sounds) (CC0).

Design doc : https://claude.ai/artifact/PozosXRE6sFL3Cmswz6uB1
