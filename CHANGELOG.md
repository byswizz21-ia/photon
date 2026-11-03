# Mises à jour

## À venir

### Nouveau

- **Designs au choix** (mode édition, pastilles en haut de la carte), repris des maquettes :
  - **Horloge** : « Journée » (secondes en accent, 24 barres des heures, semaine et jour de
    l'année) et « Cadran » (les secondes font le tour).
  - **Usage Claude** : « Jauge » (anneau de la session et du temps écoulé, ce qu'il reste) et
    « Tableau » (session, 7 jours, histogramme, projection au rythme actuel). Offre à choisir
    (Pro, Max 5x, Max 20x) : les limites sont estimées, Anthropic ne les publie pas en tokens.
  - **Météo** : « Détails » (plus la carte grandit, plus elle en montre : heures, vent,
    humidité, pluie, UV, lever et coucher, 5 jours) et « Soleil » (course du soleil, carte
    teintée selon sa position, violette la nuit).
  - **Habitudes** : « Aujourd'hui » (un rond à cocher par habitude, points des 7 jours) et
    « Historique » (20 semaines, record, part des 30 derniers jours ; clic sur un jour pour le
    cocher).
  - **Son** : « Molette » (arc à tourner) et « Mélangeur » (volume en segments et volume de
    chaque app qui joue du son, comme le mélangeur de Windows).
- Chaque design a sa taille minimale : la carte s'agrandit d'elle-même quand on le choisit et
  ne peut pas descendre en dessous.

### Amélioré

- **Sons** : Bois (marimba feutré) devient l'ambiance par défaut.
- **Musique, design « Adapté »** : tient dans une carte de 3 × 3 cases (4 × 4 avant) et suit la
  taille de la carte : pochette, disque et onde grandissent, plus de paroles (Spotify) et de
  titres « À suivre » (YT Music) quand il y a de la place.

### Corrigé

- Une carte au design exigeant (musique « Adapté ») pouvait grandir d'une case pour rien au
  démarrage : la grille n'avait pas encore sa vraie largeur.

### Retiré

- **Ambiances Piano et Industriel** : il en reste cinq (Verre, Bois, Souffle, Onde, Tactile).
  Qui avait choisi l'une des deux retrouve Bois.

## 1.2.0 · 3 novembre 2026

### Nouveau

- **16 widgets** :
  - **Tirage au sort** : dés (1 à 6, de 4 à 100 faces), pile ou face, un nom dans une liste
    (avec ou sans remise), un nombre entre deux bornes.
  - **Anniversaires** : prochains anniversaires et âge atteint ; rappel la veille et le jour J.
  - **Abonnements** : coût par mois et par an, prochain prélèvement de chacun ; rappel la veille
    (et 7 jours avant un abonnement annuel).
  - **Budget du mois** : plafond, dépenses par catégorie, reste à dépenser par jour.
  - **Corbeille** : taille, vider (avec confirmation), ouvrir.
  - **Captures récentes** : dernières captures d'écran, à glisser directement dans Discord ou
    un mail, à copier ou jeter.
  - **Scripts** : lance `npm run dev` (ou toute commande) dans un dossier, voyant, sortie,
    bouton stop ; tout s'arrête quand Photon quitte.
  - **Test micro** : vumètre, avis sur le niveau, enregistrement de 5 s réécouté aussitôt.
  - **Traduction** : traduit pendant la frappe (MyMemory sans clé, DeepL avec une clé gratuite).
  - **Jeux gratuits** : jeux offerts sur Epic Games (et ceux de la semaine suivante), Steam, GOG.
  - **Bus et tram** : prochains passages en temps réel à un arrêt Divia (Dijon).
  - **Matchs** : foot (ligue ou équipe), League of Legends, Valorant : en direct, à venir,
    résultats.
  - **Sorties** : jeux attendus sur Steam ; films et séries avec une clé TMDB gratuite.
  - **Actualités** : les derniers articles sur tes sujets (mots-clés lus sur Google Actualités, ou
    l'adresse RSS d'un site), filtre par sujet, clic pour ouvrir l'article. Lus en fond toutes les
    30 min, jamais à l'ouverture.
  - **Citations** : une citation par jour parmi les thèmes cochés (motivation, business, code,
    philosophie, science, sport, art, humour) et tes propres citations ; « Une autre », « Copier ».
  - **Échecs** : problème du jour Lichess avec série de jours, entraînement (problèmes à la chaîne,
    indice, solution), partie contre l'ordi (Facile, Moyen, Difficile ; Blancs, Noirs ou au hasard ;
    annuler) ou à deux sur le même écran. Les parties en cours sont gardées.
- **Notifications** : toutes passent par un même système, réglable dans Réglages ›
  Notifications (tout couper, ou source par source, et notification d'essai). L'avertissement
  avant un arrêt du PC part toujours.
- **Notifications de Photon** : cartes de verre fumé aux couleurs du thème, en bas à droite de
  l'écran du curseur. Icône du widget (ou pochette), boutons (« Suivant » pour la musique,
  « Revenir » pour un profil auto, « Annuler » avant un arrêt du PC), barre de temps qui se
  met en pause au survol, petit tintement. Les rappels restent jusqu'au clic. En jeu plein
  écran ou en Ne pas déranger, Windows prend le relais. Réglages › Notifications › Style :
  Photon ou Windows.
- **Ambiances sonores** : sept sound designs au choix dans Réglages › Sons, avec « Écouter
  l'ambiance ». Synthétisés : Verre (celui d'avant), Bois (marimba feutré), Souffle (de l'air,
  presque rien). À partir de vrais sons : Onde, Piano et Industriel (kits SND), Tactile
  (Kenney). Tous calés sur le même volume ressenti.
- **Rappels** : Agenda (5 à 60 min avant chaque événement, réglé dans le widget), Compte à
  rebours (la veille et le jour J), Micro-entreprise (déclaration URSSAF 7 jours avant puis le
  dernier jour), Suivi du temps (chrono qui tourne depuis plus de 4 h).
- **Animation d'ouverture** : à la toute première ouverture, un point de lumière éclate, le nom
  « Photon » apparaît puis rejoint l'en-tête, l'interface et les widgets arrivent en cascade et
  le raccourci est montré. Deux variantes : plein écran (14 s) et fenêtre (10 s). Clic ou
  touche (ou le raccourci de Photon) pour passer ; Réglages › « Revoir l'animation
  d'ouverture ».

## 1.1.0 · 2 novembre 2026

### Nouveau

- **Sons** : petit sound design généré à la volée (ouverture, fermeture, clics, réglages,
  profils, mode édition). Réglages « Sons » : activer, volume, trois familles de sons.
- **Menu « Ajouter »** : widgets rangés par rubrique, avec recherche (sans accents, Entrée
  ajoute le premier) et une phrase qui dit ce que fait chacun. « Voir tous les widgets en
  aperçu » ouvre un catalogue avec le vrai widget.
- **Musique « Adapté »** : volume sur les 4 lecteurs, YT Music fidèle à la maquette, file
  « À suivre ». La carte grandit à la taille où le design tient et ne descend plus en dessous.

### Amélioré

- **Arrondis** : tous suivent celui des cartes (Réglages › Arrondi) : champs, tuiles, menus et
  boutons s'arrondissent ensemble. Arrondi par défaut 24 px. En mode fenêtre, la bordure suit
  les coins de Windows ; en mode édition, l'arc de redimensionnement et le × épousent le coin.
- **Profils** : compatibles d'une version à l'autre. Numéro de format avec conversions
  automatiques ; widgets, réglages et champs inconnus gardés (retour en arrière sans perte) ;
  un fichier illisible est mis de côté en `.broken-<date>` au lieu d'être écrasé.

### Corrigé

- Les widgets ne bougent plus tout seuls (après la barre seule, un redémarrage ou une fenêtre
  étroite). Les profils déjà mélangés sont à remettre en place une fois.

## 1.0.0 · 31 octobre 2026

Première version : grille de widgets sur verre, barre de commande, profils avec bascule
automatique, thèmes, plein écran ou fenêtre.
