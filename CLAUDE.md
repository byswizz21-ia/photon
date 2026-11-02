# Photon

Fenêtre glass de widgets pour Windows : Electron + Svelte 5 + TypeScript (electron-vite) + gridstack.js.
Source de vérité : le design doc https://claude.ai/artifact/PozosXRE6sFL3Cmswz6uB1 (le tenir à jour).

## Lancer depuis Windows, jamais depuis WSL

Toutes les commandes npm tournent côté Windows (PowerShell ou terminal VS Code Windows).
Depuis WSL : `powershell.exe -NoProfile -Command "cd 'C:\Users\caca\Claude\ClaudeProjet\ergo-app'; npm run dev"`.
Un `npm install` lancé dans WSL installerait les binaires Linux d'Electron.

## Commandes

- `npm run dev` : lance l'app avec rechargement à chaud
- `npm run typecheck`, `npm run lint`, `npm test` : toujours au vert avant un commit
- `npm run format` : formate avec Prettier
- `npm run icons` : régénère logo et icônes dans `assets/`
- `npm run dist` : installateur `.exe` dans `dist/`

## Exigences non négociables

- Instantané : la fenêtre est créée au démarrage puis seulement affichée ou cachée, jamais rechargée.
  Animations sur `transform` et `opacity` uniquement. Infos système lues seulement fenêtre visible.
  Aucun appel réseau à l'ouverture.
- Sécurité : `contextIsolation`, `sandbox`, pas de `nodeIntegration`. L'interface ne parle à Windows
  que via `window.photon`, défini dans `src/shared/api.ts`.
- Robustesse : un widget qui plante n'affiche une erreur que dans sa case. JSON écrits de façon
  atomique avec copie `.bak` (`src/main/store.ts`).
- Style : Photon Design System. Couleurs, rayons, ombres, tailles de texte et durées passent par
  les tokens de `src/renderer/tokens.css`, jamais en dur. Règles (icônes, textes en français, verre) :
  readme du design system (`Photon Design System.zip`).
- Code : TS strict, un fichier = un rôle, noms en anglais, commentaires courts en français.
  Pas de dépendance hors stack sans raison écrite.

## Profils compatibles d'une version à l'autre

Les profils de Hugo doivent survivre à chaque mise à jour. Champ nouveau = optionnel, avec valeur
par défaut dans `parse*` (`src/shared/model.ts`). Ne jamais renommer un dossier de widget, une clé
de réglage ni changer son type sans conversion de l'ancien format dans `parseProfile` (avec test).
Un widget retiré reste dans le JSON, invisible ; ses réglages inconnus sont gardés.

## Ajouter un widget

Copier `src/renderer/widgets/_template/` vers `src/renderer/widgets/<nom>/`, puis remplir `manifest.ts`
et le composant. Rien d'autre à toucher : l'app découvre le dossier toute seule. Guide : `README.md`.
