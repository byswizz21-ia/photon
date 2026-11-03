# Idées de widgets

Idées proposées le 3 novembre 2026 et pas encore faites. Effort : facile (une soirée), moyen
(une journée), costaud (plus, ou dépend d'une API fragile).

## Auto-entrepreneur

| Widget              | Ce qu'il ferait                                                                                      | Effort        | Comment                                           |
| ------------------- | ---------------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------- |
| Infos pro           | Boutons « copier » : SIRET, IBAN, adresse, mention « TVA non applicable, art. 293 B du CGI »         | Facile        | Réglages du widget + `copyText`                   |
| Factures en attente | Factures envoyées (montant, échéance), en rouge si en retard, rappel                                 | Facile, moyen | Données partagées + rappel dans `reminders.ts`    |
| Prix net            | Tarif → ce qui reste après cotisations URSSAF, et l'inverse (« pour toucher 500 € net, facturer X ») | Facile        | Taux déjà dans `shared/micro.ts` (vérifier Micro) |

## Dev

| Widget         | Ce qu'il ferait                                                        | Effort | Comment                                                                 |
| -------------- | ---------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------- |
| Sites en ligne | Teste ses sites/API toutes les X min : code HTTP, latence, point rouge | Facile | `backgroundFeed` (src/main/feeds.ts) + `getText`                        |
| GitHub CI      | Derniers workflows et PR ouvertes des dépôts choisis                   | Moyen  | Passer par `gh` (déjà connecté), pas de jeton                           |
| WSL / Docker   | Distros WSL et conteneurs, état, démarrer / arrêter                    | Facile | `wsl -l -v`, `docker ps` (attention : `wsl --shutdown` tue Claude Code) |

## Windows pratique

| Widget               | Ce qu'il ferait                                                          | Effort  | Comment                                                      |
| -------------------- | ------------------------------------------------------------------------ | ------- | ------------------------------------------------------------ |
| Téléchargements      | Derniers fichiers téléchargés : ouvrir, glisser, supprimer               | Facile  | Copier `src/main/screenshots.ts` (glisser déjà fait)         |
| Mises à jour apps    | Apps à mettre à jour (`winget upgrade`), bouton « tout mettre à jour »   | Moyen   | Sortie de winget à lire, lente (≈ 5 s) : à la demande        |
| Wi-Fi                | Mot de passe du Wi-Fi actuel + QR code pour le partager                  | Facile  | `netsh wlan show profile key=clear` ; QR = petite dépendance |
| Luminosité           | Luminosité de l'écran, écran externe compris                             | Costaud | DDC/CI en C# pour les écrans externes                        |
| Mode jeu / focus     | Un clic : ferme les apps choisies, coupe les notifs, lance un pomodoro   | Moyen   | Réutiliser Focus (profils) et `processClose`                 |
| Raccourcis texte     | Phrases toutes faites (adresse, mail type, signature) copiées en un clic | Facile  | Proche des textes épinglés du Presse-papiers                 |
| Webcam miroir        | Aperçu de la webcam avant une visio                                      | Facile  | `getUserMedia` comme Test micro                              |
| Imprimante           | Niveaux d'encre, file d'attente, vider la file                           | Costaud | WMI, encre rarement exposée                                  |
| Gros fichiers        | Les 10 plus gros fichiers d'un disque, pour faire de la place            | Moyen   | Scan lent : à la demande, en fond                            |
| Fond d'écran du jour | Image Bing ou NASA du jour, appliquée au fond Windows                    | Moyen   | Lecture en fond une fois par jour                            |

## Vie quotidienne

| Widget                 | Ce qu'il ferait                                      | Effort | Comment                              |
| ---------------------- | ---------------------------------------------------- | ------ | ------------------------------------ |
| Courses                | Liste par rayon, ce qui est coché descend            | Facile | Proche de To-do                      |
| Plantes                | Rappel d'arrosage par plante, dernier arrosage       | Facile | Données partagées + rappel           |
| Médicaments            | Prises du jour à cocher, rappels à heure fixe        | Facile | Proche d'Habitudes + rappel          |
| Hydratation            | Verres d'eau du jour, objectif, rappel               | Facile | Proche de Pause des yeux             |
| Qualité de l'air       | Indice du jour, pollens (Open-Meteo, sans clé)       | Facile | Comme Météo                          |
| Lever / coucher soleil | Heures et durée du jour (calcul local, aucun réseau) | Facile | Formule astronomique, ville de Météo |
| Suivi de colis         | Numéro La Poste / Colissimo, statut                  | Moyen  | Clé API La Poste (gratuite)          |
| Prix carburant         | Stations les moins chères autour de soi              | Moyen  | Open data gouv (prix-carburants)     |

## Études

| Widget             | Ce qu'il ferait                                             | Effort | Comment                                                             |
| ------------------ | ----------------------------------------------------------- | ------ | ------------------------------------------------------------------- |
| Emploi du temps    | Lien `.ics` (Pronote, ENT, ADE) : cours en cours et suivant | Moyen  | `src/main/ical.ts` existe déjà (Agenda)                             |
| Fiches de révision | Cartes question / réponse, répétition espacée façon Anki    | Moyen  | Données partagées, algorithme SM-2                                  |
| Compteur de mots   | Mots, caractères, temps de lecture d'un texte collé         | Facile | Tout dans l'interface                                               |
| Mémo vocal         | Enregistrer et réécouter des mémos audio                    | Moyen  | `MediaRecorder` (déjà utilisé par Test micro), fichiers chez Photon |

## Suites possibles des widgets du 3 novembre

- **Bus et tram** : d'autres réseaux (Navitia couvre presque toute la France, avec une clé
  gratuite navitia.io) ; plusieurs arrêts dans un widget ; rappel « ton bus passe dans 5 min ».
- **Matchs** : notification au coup d'envoi et au score final ; CS2 ; logos Valorant (pas dans
  la liste de vlr.gg).
- **Sorties** : dates Steam en français (« 3 nov. 2026 ») converties en « dans N j ».
- **Abonnements / Budget** : relier les deux (les prélèvements comptent dans le budget).
- **Captures** : renommer, ouvrir dans l'outil Capture pour annoter.
- **Scripts** : ouvrir le dossier dans VS Code, relancer tout seul après un plantage.

## Améliorations visuelles (revue des 55 widgets, 3 novembre)

Photos prises à la taille par défaut, widgets vides, thème sombre. Rien n'est encore corrigé.

**Vrais défauts**

- **Échecs** : onglets (Du jour, Entraînement, Ordi, À deux) sur 2 lignes ; chiffres des rangées
  par-dessus les pièces ; grand vide sous l'échiquier.
- **Jours fériés** : la barre de défilement cache les compteurs (« 8 j » coupé).
- **Cours** : mini-courbes mal alignées (leur largeur suit la longueur du prix).
- **Moyenne** : « —— /20 » sans note ; le champ coefficient « 1 » n'a pas d'étiquette.
- **Disque** : C: en grand, D: en petit avec une barre différente.

**Cohérence**

- Titre gris en majuscules absent : Météo, Compte à rebours, Citations, Bus et tram. Pomodoro :
  titre au milieu de la carte.
- Message de widget vide en haut à gauche (Agenda, Projets Git) au lieu de centré.
- Aucun message quand c'est vide : To-do, Habitudes, Temps, Budget.

**Tailles par défaut trop grandes** : Budget, Cours, Matchs, Fuseaux horaires, Pipette,
Batteries, Anti-veille, Minuteur d'arrêt.

**Détails** : Favoris (barre de défilement au milieu, icônes pixelisées) ; Ports et Processus
(dernière ligne coupée) ; Minuteur d'arrêt (champ « 60 » au style différent des choix).
