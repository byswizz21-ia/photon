# Mission : coder Photon V1

Tu es le **lead** d'une équipe d'agents. Objectif : livrer la V1 de Photon complète, propre et testée. Rien d'oublié, rien de superflu : chaque token dépensé doit servir la V1.

## Autonomie
- Tu as tous les droits dans ce dossier. Ne me demande aucune validation : tranche seul selon le doc et note tes choix dans le rapport final.
- Tu ne m'interromps que pour un vrai bloqueur que moi seul peux lever (login, action physique). Sinon tu avances.
- `git init` à l'étape 1, puis un commit local par étape validée. Pas de push.

## Source de vérité
- **Design doc** : https://claude.ai/artifact/PozosXRE6sFL3Cmswz6uB1. Charge le skill `docs` avant de le lire. Lis-le **en entier, une seule fois**, au début.
  - Sections clés : Exigences non négociables, Direction artistique, Comportement de la fenêtre, Multi-écran, Plan technique V1 (stack, architecture, structure, format des données, étapes, points à vérifier).
- **Maquettes et logo** : https://claude.ai/artifact/TZiw4JAC1j5PFSnUJ7xQNo. Lis-les avec l'outil Artifact `read`.
  - Le board « Photon en situation » est la référence visuelle.
  - Le board « Composant logo » contient le SVG du logo.
- Si le doc et ce prompt divergent, le doc gagne. Si une contrainte technique t'oblige à changer une décision, mets le doc à jour.

## Périmètre : les 6 étapes V1 du doc, rien de plus
1. **Squelette** :
   - projet electron-vite + Svelte 5 + TS strict ;
   - fenêtre sans bordure avec flou acrylic ;
   - icône dans la zone de notification ;
   - raccourci global, afficher/cacher ;
   - lancement caché au démarrage de Windows.
2. **Fenêtre** :
   - mode plein écran et mode fenêtre libre redimensionnable, avec l'option « toujours au-dessus » ;
   - fermeture par le raccourci, Échap, un clic dans le vide, ou la perte de focus (plein écran uniquement) ;
   - ouverture sur l'écran de la souris, avec révélation lumineuse en moins de 300 ms.
3. **Système de widgets** :
   - découverte automatique des dossiers `widgets/` et grille gridstack ;
   - mode édition : déplacer, redimensionner, ajouter, supprimer ;
   - sauvegarde du profil en JSON ;
   - le modèle de données gère déjà plusieurs profils (voir le doc).
4. **Widgets** :
   - Horloge (chiffres qui défilent) ;
   - Lanceur (glisser-déposer un raccourci ; Photon se cache au lancement) ;
   - Disques ;
   - CPU/RAM.
5. **Thème** :
   - panneau de réglages : fond (image, dégradé ou fond d'écran Windows), accent auto ou manuel, flou, opacité, arrondi, densité ;
   - bordures qui s'éclairent au survol.
6. **Installateur** : .exe avec electron-builder ; logo « point en orbite » dans la zone de notification et comme icône de l'app.

**Hors V1, à ne pas coder, même en partie :**
- barre de commande et mini-mode ;
- interface des profils ;
- YT Music, Claude ;
- autres widgets ;
- règle anti-plein-écran, animation de démarrage.

## Phase 0 : vérifs avant de coder (courte, en parallèle)
1. **Environnement.** L'app tourne **côté Windows** : Node 24 est installé sous Windows.
   - Si tu tournes dans WSL, chaque commande node/npm passe par `powershell.exe -NoProfile -Command "cd 'C:\Users\caca\Claude\ClaudeProjet\ergo-app'; ..."`.
   - Ne lance jamais npm de WSL dans ce dossier : il installerait les binaires Linux.
2. **Stack.** Vérifie avec Context7 (`agent-docs`), ou une recherche web si besoin, les versions stables actuelles et leur compatibilité : Electron, electron-vite, Svelte 5, gridstack.js, systeminformation, phosphor-svelte, electron-builder, vitest. Points à confirmer :
   - `backgroundMaterial: 'acrylic'` avec `frame: false`, transparence comprise, sur Windows 11. Le plein écran doit être une fenêtre sans bordure à la taille de l'écran, pas le fullscreen natif, si l'acrylic y casse.
   - Intégration gridstack avec Svelte 5 : comment monter un composant dans un item.
   - `globalShortcut` avec la touche Win : vérifier la valeur de retour de `register()`. Win+Shift+Space est déjà pris par Windows pour le changement de langue, donc il faut un repli.
   - `setLoginItemSettings` avec un argument pour démarrer caché.
   - Satoshi : licence Fontshare, puis téléchargement des .woff2 dans `assets/`.
3. **Skills.**
   - Lance `skill-finder` pour repérer les skills utiles (Electron, Svelte 5, gridstack).
   - Design des widgets : `frontend-design` s'il est installé, sinon `glassmorphism`.
   - Revue UI : `web-design-guidelines`.
   - Lancer et vérifier l'app : `run`.
4. **Sortie.** Une note de 10 lignes maximum : versions retenues et pièges. Si une brique pose problème, prends l'alternative la plus simple et note-la.

## Équipe (économie de tokens)
- **Toi, le lead**, tu codes toi-même les étapes 1 à 3. Elles sont séquentielles et couplées : les déléguer coûterait plus cher.
- **Avant l'étape 4**, tu poses toi-même le contrat :
  - fonctions de `system.ts` ;
  - `window.photon` typé ;
  - type `WidgetManifest` ;
  - dossier `widgets/_template/`.
- **Agents en parallèle**, seulement sur des fichiers disjoints, avec `model: sonnet` :
  - **Phase 0** : 2 ou 3 agents de vérification de la doc.
  - **Étape 4** : 1 agent par widget, soit 4 agents. Chacun ne touche que `widgets/<nom>/`.
  - **Étapes 5 et 6** : en parallèle, un agent pour le thème et un pour l'installateur.
- **Brief d'agent** : court et autonome. Il contient :
  - la tâche ;
  - les fichiers autorisés ;
  - l'extrait utile du doc (pas le doc entier) ;
  - les critères de fin ;
  - les interdits.

  L'agent répond en 5 lignes maximum, sans recoller son code.
- **Relecteur** : un agent neuf après l'étape 3, puis après l'étape 4. Il compare le code aux exigences et au doc, et liste ce qui manque ou casse. Tu corriges avant de commit.
- **Audit final de complétude** : un agent reprend chaque point V1 du doc (étapes, exigences non négociables, points techniques, DA) et le coche avec sa preuve (`fichier:ligne`). Tout point non coché, tu le fais.

## Règles de code (non négociables)
- **Vitesse**
  - La fenêtre est créée au boot, puis seulement affichée ou cachée, jamais rechargée. Cible : moins de 100 ms entre le raccourci et la fenêtre visible. Mesure-le et logge-le.
  - Animations sur `transform` et `opacity` uniquement. Réactions en moins de 200 ms. Option « réduire les animations ».
  - Les infos système ne sont interrogées que quand la fenêtre est visible. Aucun appel réseau à l'ouverture.
- **Sécurité Electron**
  - `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`.
  - Pont minimal et typé : l'interface ne parle à Windows que via `window.photon`.
- **Robustesse**
  - Un widget qui plante n'affiche une erreur que dans sa case (`<svelte:boundary>`).
  - Écriture JSON atomique (fichier temporaire, puis remplacement) avec un `.bak`. Un JSON corrompu entraîne la reprise du `.bak`, puis des valeurs par défaut.
- **Qualité**
  - TS strict, ESLint et Prettier.
  - `typecheck`, `lint` et `test` au vert à chaque étape.
  - Tests vitest sur la sauvegarde (atomique, corruption) et sur la sérialisation de la grille et du profil, et rien d'autre.
- **Lisibilité**
  - Un fichier = un rôle. Noms en anglais, commentaires courts en français, seulement là où ce n'est pas évident.
  - Aucune dépendance hors stack sans raison écrite. Pas d'abstraction « pour plus tard ».
- **Widgets**
  - Un widget = un dossier (`manifest.ts` + composant). Ajouter un widget = copier `_template/`. Rien d'autre à toucher.
- **Fichiers projet**
  - Crée à l'étape 1 un **CLAUDE.md** projet court : lien du doc, « lancer depuis Windows », exigences, comment ajouter un widget, commandes.
  - **README** avec un guide « créer un widget ».

## Design
- Suis la DA du doc :
  - concept « lumière » ;
  - verre style B (fumé sombre, accents lumineux) ;
  - Satoshi ;
  - Phosphor duotone ;
  - accent extrait automatiquement du fond.
- **Interactions** : au survol, la carte se soulève et sa bordure s'éclaire ; à l'appui, elle passe à 97 % puis revient avec un ressort ; les chiffres défilent (`svelte/motion`).
- **Tokens de départ**, tirés de la maquette :

  | Élément | Valeur |
  |---|---|
  | Fond | `#07080B` |
  | Texte | `#F3F4F6`, `#A3A8B3`, `#8B909B` |
  | Accent par défaut | `#7CC4FF` |
  | Lueur secondaire | `#7A5CFF` |
  | Panneau | `rgba(16,18,24,.5)`, bordure `rgba(255,255,255,.08)`, rayon 28 |
  | Carte | `rgba(255,255,255,.04)`, rayon 20 |
  | Horloge | 96 px, graisse 200, chiffres tabulaires |

- **Logo « orbite »** (viewBox 64, `stroke-linecap: round`) :
  - Grand : arc `M50.13 23.55 A20 20 0 1 1 40.45 13.87` (trait 3.5, opacité .6) et point `cx 46.14 cy 17.86 r 7`, couleur accent avec une lueur `drop-shadow`.
  - 20 px et moins : arc `M51.1 26.1 A20 20 0 1 1 37.9 12.9` (trait 6.5, opacité .7) et point `r 9.5`, sans lueur.
  - Génère les PNG et le .ico (16, 32, 48 et 256) avec un script ponctuel, sans dépendance à l'exécution.

## Vérification
- Chaque étape se termine par :
  - un vrai lancement (`npm run dev` côté Windows, skill `run`) ;
  - les checks au vert ;
  - un commit.
- Ce que tu ne peux pas tester toi-même (raccourci réel, ressenti des animations, rendu du flou) part dans une checklist pour moi.

## Rapport final (court)
1. Ce qui est fait, étape par étape.
2. Les commandes pour lancer et pour builder.
3. Les choix que tu as tranchés seul.
4. Ma checklist de tests manuels.
5. Les écarts avec le doc.

Mets aussi le doc à jour : « Points techniques à vérifier » avec ce qui a été confirmé, et « Points à creuser ».
