# ASTRIA — Les Éclats du Ciel Brisé

**Document de Game Design (GDD) — Proposition complète v1.0**
*Jeu mobile idle RPG / hero collector free-to-play*

---

## Sommaire

1. [Concept général du jeu](#1-concept-général-du-jeu)
2. [Univers et direction artistique](#2-univers-et-direction-artistique)
3. [Système de héros](#3-système-de-héros)
4. [Gameplay principal](#4-gameplay-principal)
5. [Modes de jeu](#5-modes-de-jeu)
6. [Progression et rétention](#6-progression-et-rétention)
7. [Monétisation free-to-play](#7-monétisation-free-to-play)
8. [Économie du jeu](#8-économie-du-jeu)
9. [Interface utilisateur](#9-interface-utilisateur)
10. [Première version jouable / MVP](#10-première-version-jouable--mvp)

---

# 1. Concept général du jeu

## Nom du jeu

**ASTRIA : Les Éclats du Ciel Brisé**
(nom court pour les stores : **ASTRIA**)

## Pitch en une phrase

> Collectionnez les Éveillés, héros liés aux éclats d'une étoile brisée, et reconstruisez le ciel d'un monde flottant qui continue de vivre — et de se battre — même quand vous dormez.

## Univers narratif original

Il y a mille ans, le **Cœur Céleste** — l'étoile qui maintenait le monde d'Astria uni — a explosé lors d'un cataclysme appelé **la Fracture**. Le continent s'est brisé en des centaines d'**îles flottantes**, suspendues dans un océan de nuages. Les éclats de l'étoile, les **Astérites**, sont tombés sur ces îles et ont fusionné avec certains êtres : les **Éveillés**, des héros dotés de pouvoirs liés à un fragment d'étoile.

Mais dans le vide laissé par le Cœur Céleste s'est engouffrée **la Brume** : une marée d'ombre qui dévore les îles une à une et corrompt les créatures qu'elle touche.

Le joueur incarne **l'Astrelien** (ou l'Astrelienne) : le dernier Porteur de la **Boussole d'Aube**, un artefact capable de localiser les Astérites et de rallier les Éveillés. Sa mission : rassembler les héros des cinq grandes civilisations survivantes, repousser la Brume, et rallumer le Cœur Céleste — éclat par éclat.

**Fil narratif long terme** : chaque chapitre de campagne reconquiert une île, chaque île restaurée rallume visuellement une portion du ciel dans le hub du joueur. La reconstruction du ciel est la métaphore visible de la progression (comme l'arbre-monde d'AFK Journey, mais dynamique et personnelle).

## Ton visuel et ambiance générale

- **Ton** : aventure lumineuse avec une pointe de mélancolie — un monde magnifique mais blessé, que le joueur répare. Ni sombre ni enfantin : « chaleureux-épique ».
- **Ambiance** : ciels immenses, lumière dorée, îles verdoyantes contrastant avec la Brume violette/noire qui ronge les bords du monde.
- **Humour** : présent via certains personnages (mascottes, héros excentriques), jamais parodique.

## Public cible

- **Cœur de cible** : 18-35 ans, joueurs mobiles mid-core, habitués des idle RPG (AFK Arena, AFK Journey, Idle Heroes, Legend of Mushroom), sessions courtes mais fréquentes (3-6 sessions/jour de 5-15 min).
- **Cible secondaire** : joueurs casual attirés par la collection et la direction artistique ; joueurs RPG « premium » séduits par la narration.
- **Marchés prioritaires** : Europe francophone au lancement, puis global (EN, DE, ES, PT-BR), puis Asie du Sud-Est.

## Ce qui rend ASTRIA différent des autres idle RPG

1. **Le ciel qui se reconstruit** : la progression n'est pas qu'une barre d'XP — le hub du joueur (son île-sanctuaire) et le ciel au-dessus changent visuellement à chaque chapitre terminé. Le monde *montre* la progression.
2. **Le système de Constellations** : au lieu de simplement dupliquer les héros pour les monter en étoiles, le joueur relie ses héros entre eux sur une carte du ciel (une vraie carte de constellations) : chaque lien débloque des bonus d'équipe et des dialogues inédits entre héros. La collection devient un puzzle relationnel, pas juste une liste.
3. **La Marée de Brume** : un événement mondial quotidien où la Brume attaque une région à heure fixe — tous les joueurs du serveur défendent ensemble via leurs équipes AFK. Coopération passive, sentiment de serveur vivant.
4. **Des ultimes « interactifs légers »** : le combat est auto, mais déclencher un ultime au bon moment (avec un simple tap) donne un bonus de timing — assez de skill expression pour le PvP, zéro friction pour l'AFK.
5. **Narration par vignettes** : des mini-scènes doublées de 20-30 secondes entre héros (façon roman visuel très court) débloquées par les Constellations — l'attachement aux personnages est le vrai moteur de rétention.

---

# 2. Univers et direction artistique

## Monde principal

**Astria** : un archipel d'îles flottantes suspendues au-dessus de la **Mer de Nuées**, un océan de nuages sans fond. Au centre du ciel, la cicatrice béante du Cœur Céleste, entourée d'un anneau d'éclats scintillants. En périphérie, la **Brume** avance comme une marée noire violette.

Le joueur possède son propre hub : **le Nid d'Aube**, une petite île-sanctuaire qui grandit et s'embellit avec la progression (bâtiments déblocables : Autel d'Invocation, Forge, Taverne des Éveillés, Observatoire des Constellations, Hall de Guilde).

## Grandes régions à explorer

| Région | Civilisation | Ambiance |
|---|---|---|
| **Le Zénith Doré** | Solacia (empire du soleil) | Cités de marbre blanc et d'or, champs de blé suspendus, lumière permanente de fin d'après-midi |
| **La Sylve Suspendue** | Verdaine (peuples-racines) | Forêts géantes dont les racines pendent dans le vide, ponts de lianes, bioluminescence verte |
| **Les Forges d'Écume** | Karvok (nains-mécaniciens des geysers) | Îles volcaniques, machines à vapeur, dirigeables de cuivre, lave et brouillard chaud |
| **L'Archipel des Marées** | Nérisse (peuple des profondeurs remonté à la surface) | Îles-coquillages, cascades qui tombent dans le vide, palais de nacre, ambiance crépusculaire bleutée |
| **Le Voile Ombral** | Nyxara (exilés qui ont appris à vivre dans la Brume) | Îles noires aux cristaux violets, lanternes d'âmes, élégance gothique — inquiétant mais pas maléfique |
| **La Cicatrice** (endgame) | — | Le cœur mort de l'étoile : gravité inversée, fragments de réalité, boss majeurs de la Brume |

## Style graphique recommandé

- **Rendu** : 2.5D — personnages en **animation squelettale 2D type Spine** (riche en personnalité, coût maîtrisé, standard du genre) sur décors peints avec parallaxe. Passage possible en 3D stylisée (type AFK Journey) en année 2 si le succès le justifie.
- **Personnages** : proportions semi-chibi en combat (têtes légèrement grossies, lisibilité maximale sur petit écran), illustrations full-art détaillées pour les fiches héros et les invocations.
- **Palette** : dominantes chaudes (ors, turquoise, corail) pour le monde vivant ; violets profonds et noirs pour la Brume. Contraste narratif = contraste colorimétrique.
- **VFX** : ultimes avec cinématiques courtes (1,5-2 s) en plein écran, signature visuelle par faction.

## Ambiance des décors

Chaque écran doit répondre à la question « qu'est-ce qui flotte, qu'est-ce qui tombe, qu'est-ce qui brille ? » : cascades tombant dans le vide, pétales et poussière d'étoile en suspension, îles au loin dans la brume de distance. La verticalité et le vide sous les pieds sont l'identité du jeu.

## Types de créatures, ennemis et factions ennemies

- **Les Brumés** : créatures ordinaires corrompues par la Brume (loups, golems, oiseaux) — silhouettes reconnaissables, matière fumée violette, yeux blancs. Ennemis standards de campagne.
- **Les Échos** : copies spectrales d'Éveillés tombés pendant la Fracture — mini-boss récurrents, versions « miroir maléfique » des héros du joueur (réutilisation intelligente des assets).
- **Les Dévoreurs** : boss majeurs de la Brume, entités colossales uniques (le Léviathan de Suie, la Tisseuse de Silence, l'Avale-Soleil) — un par grande région, stars des combats de guilde.
- **Faune neutre** : créatures-mascottes capturables comme compagnons cosmétiques (les **Lumioles**, petites méduses volantes lumineuses — mascotte du jeu).

## Inspirations visuelles (sans copie)

- Lumière et ciels : l'imaginaire des mondes célestes des films d'animation japonais (châteaux volants, océans de nuages).
- Îles flottantes et exploration verticale : les jeux d'aventure « ciel ouvert » stylisés.
- Élégance des factions : l'heroic fantasy lumineuse des artbooks de MMO stylisés, plutôt que le réalisme sombre.
- UI : sobriété dorée sur fond nuit étoilée — l'interface elle-même évoque une carte du ciel.

---

# 3. Système de héros

## Nombre de factions

**5 factions jouables + 1 faction spéciale**, avec un système de contre en boucle + duo d'opposés (modèle éprouvé AFK Arena, lisible et stratégique) :

- **Boucle de contre (4 factions)** : Solacia > Verdaine > Karvok > Nérisse > Solacia
  (+25 % de dégâts et +15 % de précision contre la faction dominée)
- **Duo d'opposés** : **Nyxara** (Ombre) ⇄ **Lucens** (faction spéciale « Éclat Pur », héros rares liés directement au Cœur Céleste) — chacune inflige +30 % à l'autre.
- Les héros **Lucens** sont volontairement peu nombreux, très puissants, obtenables lentement (équivalent des Célestes/Hypogéens).

## Types de héros et classes

**6 classes**, chacune avec une icône et un rôle de placement clair :

| Classe | Rôle | Position type |
|---|---|---|
| **Rempart** (tank) | Encaisse, provoque, protège | Ligne avant |
| **Lame** (guerrier/bruiser) | Dégâts mêlée soutenus | Ligne avant |
| **Ombre** (assassin) | Burst sur l'arrière-ligne ennemie | Saute en ligne arrière ennemie |
| **Arc** (archer/tireur) | Dégâts physiques à distance | Ligne arrière |
| **Arcane** (mage) | Dégâts magiques de zone, contrôle | Ligne arrière |
| **Aube** (soigneur/support) | Soins, boucliers, buffs, énergie | Ligne arrière |

Chaque héros a en plus un **tag de sous-rôle** (Contrôle, Zone, Mono-cible, Buff, Debuff, Invocateur) pour guider la composition d'équipe.

## Raretés des héros

| Rareté | Nom | Couleur | Usage |
|---|---|---|---|
| ★★ | **Commun** | Gris | Fourrage d'amélioration uniquement |
| ★★★ | **Éveillé** | Bleu | Utiles en début de partie, certains évoluables |
| ★★★★ | **Astral** | Violet | Colonne vertébrale du roster, évoluables jusqu'au max |
| ★★★★★ | **Légendaire** | Or | Héros signature, kit complet à 4 compétences |
| ★★★★★+ | **Mythique** (Lucens & Nyxara d'élite) | Arc-en-ciel/prismatique | Très rares, gagnés lentement, jamais indispensables en PvE |

## Système d'évolution (Ascension)

Progression verticale par paliers, avec doublons **ou** monnaie universelle (anti-frustration) :

1. **Niveau** (1 → 240) : or + poussière d'étoile. **Niveau partagé par résonance** : les 5 héros les plus hauts définissent un « Cristal de Résonance » qui aligne gratuitement le niveau de tous les autres héros placés dedans (indispensable pour tester des compositions sans tout refarmer — leçon clé d'AFK Arena).
2. **Ascension** (Astral → Astral+ → Légendaire → Légendaire+ → Mythique → Mythique+ → **Stellaire**) : nécessite des doublons du héros ou des doublons de même faction. Chaque palier monte le cap de niveau et débloque la 3e puis la 4e compétence.
3. **Étoiles de Constellation** (post-Stellaire, endgame) : 1 à 5 étoiles via un item rare (**Cœur d'Astérite**), petites hausses de stats + amélioration de l'ultime.
4. **Arbre de talents de faction** : arbre partagé par faction (bonus passifs permanents), alimenté par une ressource de campagne — donne de la valeur à chaque combat même sans nouveau héros.

## Système d'équipement

- **4 pièces** par héros : Arme, Torse, Bottes, Relique (accessoire).
- Raretés d'objets : Commun → Rare → Épique → Légendaire → **Fragment d'Aube** (set endgame).
- **Sets de faction** : porter 2/4 pièces de sa faction active un bonus de set.
- **La Forge** : fusion de 3 objets identiques → rareté supérieure ; recyclage sans perte (rembourse les matériaux) pour éviter la peur d'investir.
- **Enchantement** : +0 → +20 par pièce, transférable gratuitement entre héros de même classe (anti-frustration, encourage l'expérimentation).
- Pas de stats aléatoires à re-roll au lancement (à réserver à un système endgame ultérieur, type « Gravures ») — la lisibilité prime.

## Synergies entre factions

- **Bonus d'harmonie d'équipe** : 3 héros de même faction = +10 % PV/ATK ; 5 = +25 % ; 3+2 = +15 %/+10 % ; 5 factions différentes = +8 % à tout + 20 % de génération d'énergie (« l'équipe Prisme », pour récompenser aussi la diversité).
- **Liens de Constellation** (signature du jeu) : des paires/trios narratifs précis (ex. les sœurs Maëlle & Sorren) gagnent un bonus dédié **et** débloquent une vignette narrative quand ils combattent ensemble. ~40 liens au lancement.

## Dix héros originaux

| # | Héros | Faction | Classe | Compétence spéciale (Ultime) | Personnalité |
|---|---|---|---|---|---|
| 1 | **Kaelis, la Lame du Zénith** | Solacia | Lame | **Jugement Solaire** : bond au centre du combat, onde de lumière qui frappe tous les ennemis et aveugle (précision -40 %) pendant 4 s | Chevalière droite et brûlante d'idéal, incapable de mentir, gênée par les compliments |
| 2 | **Bramble** | Verdaine | Rempart | **Cœur de l'Ancien** : se change en arbre-bouclier 6 s, absorbe 80 % des dégâts de l'équipe et riposte en racines qui immobilisent | Golem-souche placide qui parle très lentement et adopte des Lumioles blessées |
| 3 | **Maëlle des Marées** | Nérisse | Aube | **Marée Berceuse** : vague qui soigne toute l'équipe (35 % ATK/s pendant 5 s) et endort l'ennemi le plus proche | Sirène médecin, douce mais autoritaire dès qu'on refuse de se soigner ; sœur aînée de Sorren |
| 4 | **Sorren l'Abysse** | Nérisse | Ombre | **Plongée Nocturne** : disparaît dans une flaque d'ombre, réapparaît derrière le héros ennemi le plus faible, +300 % de dégâts, réinitialisé si la cible meurt | Cadet rebelle de Maëlle, sarcastique, prétend détester le travail d'équipe (protège tout le monde en secret) |
| 5 | **Grondin Feu-de-Forge** | Karvok | Arc | **Canon Geyser** : déploie une tourelle à vapeur qui tire pendant 8 s ; explose en fin de durée | Nain inventeur enthousiaste, ses créations explosent « exactement comme prévu, à 60 % » |
| 6 | **Dame Vespérine** | Nyxara | Arcane | **Bal des Lanternes** : invoque 5 lanternes d'âmes qui traquent les ennemis ; chaque lanterne vole 8 % des PV et les redistribue | Aristocrate spectrale, courtoisie glaciale, collectionne les secrets et le thé de minuit |
| 7 | **Pip & Bogue** | Karvok | Aube (Buff) | **Surrégime !** : Bogue (le golem-chaudière) surchauffe : +40 % vitesse d'attaque et +30 % d'énergie pour l'équipe pendant 6 s | Pip, gamine mécano surexcitée juchée sur Bogue, golem timide — duo comique mascotte du jeu |
| 8 | **Sylvarende** | Verdaine | Arcane (Contrôle) | **Chant des Racines-Monde** : la zone ennemie devient ronces (dégâts/s + enracinement 3 s) ; les alliés au contact des fleurs sont soignés | Dryade ancienne mi-endormie qui confond les époques et appelle tout le monde « petite pousse » |
| 9 | **Théoline Autan** | Solacia | Arc | **Pluie d'Aube** : volée de 12 flèches de lumière réparties sur la ligne arrière ennemie ; chaque coup critique rend 50 énergie aux alliés | Prodige roturière de l'académie militaire, compétitive, tient un carnet de scores contre elle-même |
| 10 | **Nhyx, l'Éclat Pur** | Lucens | Ombre (Mythique) | **Heure Silencieuse** : arrête le temps 2,5 s pour les ennemis ; chaque coup porté pendant l'arrêt marque la cible (+15 % dégâts subis ensuite) | Fragment incarné du Cœur Céleste au corps de verre étoilé ; découvre les émotions humaines une par une, littérale et étrange |

---

# 4. Gameplay principal

## Boucle de gameplay quotidienne (15-25 min réparties en 3-4 sessions)

**Session du matin (5 min)** : récolter les récompenses AFK de la nuit → monter 1-2 héros → tenter de passer le niveau de campagne bloquant → lancer les Expéditions.

**Session du midi (5 min)** : quêtes quotidiennes rapides (1 invocation gratuite, 2 combats d'arène, don de guilde) → boutique rapide.

**Session du soir (10-15 min)** : Marée de Brume (événement serveur à heure fixe) → boss de guilde → donjons de ressources → progression campagne → gestion équipement/Constellations.

## Progression AFK / idle

- L'équipe principale combat en continu sur le dernier niveau de campagne atteint, **même application fermée**.
- **Gains AFK** : or, XP de héros, poussière d'étoile, fragments d'équipement — taux croissant avec le chapitre atteint (chaque niveau franchi augmente les gains/minute : la campagne est le moteur de tout).
- **Cap d'accumulation : 12 h** (pousse à 2 connexions/jour minimum), extensible à 16 h puis 24 h via VIP/abonnement.
- **Butin instantané** : 1 fois/jour gratuit, le joueur réclame « 2 h de gains AFK » instantanément (2 tentatives bonus en diamants) — le meilleur gold sink de confort du genre.

## Combats automatiques

- **5 héros** sur une grille **2 lignes × 3 colonnes** (front/back).
- Combat 100 % automatique : attaques normales → génération d'énergie → compétences auto → **ultime**.
- Vitesse ×1/×2/×4 (×4 déblocable), mode « passer le combat » quand la puissance dépasse largement (confort endgame).

## Placement stratégique

Le placement est la première couche de skill : mettre le tank face à l'assassin ennemi, protéger son soigneur du côté opposé au burst, isoler un héros pour absorber une zone. L'écran de préparation montre la composition ennemie **avant** le combat + un indicateur de menace par colonne.

## Ultimes et compétences spéciales

- Chaque héros : 1 attaque normale + 2-3 compétences auto + 1 **ultime**.
- **Mode Auto total** (par défaut) : les ultimes partent seuls.
- **Mode Tactique** (optionnel, activé d'un toggle) : le joueur tape le portrait pour déclencher l'ultime ; un déclenchement dans la « fenêtre dorée » contextuelle (ex. juste après le regroupement ennemi) donne **+15 % d'efficacité**. Obligatoire nulle part, décisif en PvP haut niveau et boss.

## Gestion de l'énergie / ressources d'action

- **Pas d'énergie limitant la campagne** (frustration inutile, le mur de puissance suffit).
- Les **tickets** limitent les modes annexes : 2 entrées/jour par donjon de ressources, 5 combats d'arène, 3 clés de Tour bonus, 2 raids de boss de guilde. Tickets sup. achetables en diamants (doux gold sink).

## Récompenses hors ligne

Écran de retour signature : la **Boussole d'Aube** s'ouvre, le butin pleut en pièces/objets avec compteur qui défile, temps AFK affiché en grand, bouton « Réclamer » satisfaisant (haptique + son). C'est LE moment dopaminique du jeu — il doit être parfait dès le MVP.

## Système de campagne principale

- **Chapitres = îles à reconquérir**. 20 chapitres au lancement (~800 niveaux), chapitre = 40 niveaux + 1 boss d'île (Écho ou Dévoreur mineur).
- Difficulté en dents de scie : murs de puissance ~tous les 15-20 niveaux pour rythmer les pics de progression (le « mur » est la boucle de motivation : bloqué le soir → gains AFK la nuit → mur franchi au matin).
- Chaque chapitre terminé : **cinématique courte + l'île s'allume dans le ciel du hub** + déblocage éventuel de fonctionnalité.
- Mode **Épopée** (New Game+ par région) après le chapitre 20, avec modificateurs.

---

# 5. Modes de jeu

| Mode | Déblocage | Description | Cadence |
|---|---|---|---|
| **Campagne — La Reconquête** | Immédiat | Cœur du jeu, moteur des gains AFK (voir §4) | Permanent |
| **Donjons d'Astérite** (×4) | Chap. 2 | 1 donjon par type de ressource (or, poussière, équipement, essences d'ascension), rotation quotidienne, 2 tickets/jour | Quotidien |
| **La Tour de l'Éveil** | Chap. 3 | Tour infinie, 1 combat = 1 étage, difficulté croissante, récompenses par palier + classement serveur. Plus tard : 5 tours de faction (équipes mono-faction imposées) | Permanent |
| **Boss de Guilde — Les Dévoreurs** | Chap. 5 + guilde | 2 raids/jour/joueur contre un boss colossal aux PV partagés par la guilde ; classement dégâts, butin de guilde hebdo | Quotidien/hebdo |
| **Arène de l'Aube (PvP)** | Chap. 4 | PvP asynchrone : on attaque la défense IA d'autres joueurs, 5 tickets/jour, saisons de 2 semaines, récompenses de rang + boutique PvP. Plus tard : Arène Suprême (3 équipes de 5, bans de héros) | Quotidien |
| **Marée de Brume** | Chap. 6 | Événement **serveur** quotidien à 20h30 : la Brume attaque une région, tous les joueurs envoient une équipe en défense, jauge mondiale, récompenses collectives — le rendez-vous communautaire du jeu | Quotidien (15 min) |
| **Expéditions de la Boussole** | Chap. 3 | Missions automatiques : on assigne des héros inutilisés 2/4/8 h → ressources. Valorise la profondeur de collection | Quotidien |
| **Défis hebdomadaires** | Chap. 5 | 3 combats à contraintes (« sans soigneur », « 100 % Verdaine », « le boss reflète les dégâts ») — pousse à élargir son roster | Hebdo |
| **Les Failles d'Écho (roguelite)** | Chap. 8 | Exploration optionnelle : carte de nœuds (combats, événements, marchand, repos), choix de **Bénédictions d'Astérite** temporaires à chaque étage, run de 20-30 min, 2 runs/semaine. Inspiré des Sentiers oniriques, avec builds cassés temporaires assumés | Hebdo |
| **Événements temporaires** | Post-lancement | Événements narratifs de 2 semaines avec héros vedette, mini-jeu léger (gestion, puzzle), boutique d'échange de jetons | Bi-mensuel |

---

# 6. Progression et rétention

## Les 5 premières minutes (le funnel d'onboarding)

1. **0:00-0:30** — Cinématique jouable : la Fracture, on contrôle brièvement un Éveillé Mythique surpuissant (Nhyx) qui sera « perdu » — promesse de puissance future.
2. **0:30-1:30** — Premier combat auto gagné, premier niveau up, on reçoit Kaelis (Légendaire garanti scénarisé).
3. **1:30-3:00** — **Première invocation ×10 gratuite** avec animation complète ; Légendaire garanti dans le tuto.
4. **3:00-4:30** — 3 niveaux de campagne enchaînés, premier équipement, premier passage de chapitre : l'île s'allume, wow moment visuel.
5. **4:30-5:00** — Découverte de l'écran AFK : « Vos héros combattront pendant votre absence » + quête « revenez dans 2 h pour vos premières récompenses AFK ». Pré-inscription des notifications push.

**Objectif mesurable** : première invocation < 3 min, premier « moment ciel » < 5 min, tutoriel complet < 8 min.

## Après 1 jour

Arène débloquée, 4 donjons de ressources, Tour de l'Éveil, ~40-60 invocations cumulées (pluie de récompenses J1), premier héros Astral+ ascensionné, événement « 7 jours de connexion » entamé (J7 = Légendaire au choix parmi 3).

## Après 7 jours

Guilde rejointe + premier boss de guilde, Marée de Brume vécue, Failles d'Écho débloquées, première équipe cohérente de faction (~chapitre 6-8), fin de l'événement 7 jours (Légendaire choisi), **Pass du Voyageur** (battle pass) mis en avant, premières Constellations reliées et première vignette narrative vue.

## Après 30 jours

Chapitre 12-15, premier héros Mythique, roster de 25-35 héros dont 2e équipe pour le PvP, rang d'arène stabilisé (objectif de saison), arbre de talents de faction niveau 3-4, boutique de guilde optimisée en routine, premier événement temporaire complet vécu, objectif clair : héros **Stellaire** + équipe Prisme + chapitre 20.

## Les raisons de revenir chaque jour

1. Récompenses AFK plafonnées à 12 h (2 connexions minimum).
2. Marée de Brume à heure fixe (rendez-vous social).
3. Quotidiennes + coffre d'activité (100 points = coffre premium du jour).
4. Tickets qui expirent (donjons, arène, raids de guilde — « les perdre = gâcher »).
5. Boutique quotidienne avec 1 très bonne affaire/jour.
6. Événements à jetons quotidiens.
7. Connexion cumulative mensuelle (jour 28 = Légendaire).
8. Obligations de guilde (dons, raids) = pression sociale positive.

## Récompenses quotidiennes

- **Connexion** : calendrier mensuel (diamants, invocations, J14 héros Astral, J28 Légendaire).
- **Coffre d'activité** : 5 quotidiennes simples (10-20 pts chacune) → 3 coffres (40/70/100 pts).
- **Cadeau de Marée** : participation à la Marée de Brume = coffre collectif.

## Objectifs long terme

Rallumer les 20 îles (puis extensions), monter un héros Stellaire 5 étoiles de Constellation, compléter le codex des 60+ héros et toutes les vignettes narratives, top 100 d'arène, guilde top 10 serveur, finir les 5 tours de faction, collection de skins et de Lumioles.

## Mécaniques sociales de rétention

- **Guilde** : chat, dons de fragments quotidiens (donner rapporte aussi), raids coordonnés, boutique de guilde, objectifs hebdo communs.
- **Marée de Brume** : réussite collective visible (« le serveur a repoussé la Brume à 97 % »).
- **Mentorat** : un vétéran parraine un nouveau ; les deux gagnent des récompenses aux jalons du filleul (rétention des deux côtés).
- **Amis** : 30 amis max, envoi quotidien de « Lueurs » (monnaie d'invocation d'amitié), emprunt d'un héros d'ami 1×/jour pour un donjon.
- **Vitrine de profil** : hall des héros, titres, île visitables par les autres.

---

# 7. Monétisation free-to-play

**Philosophie** : monétiser la **vitesse et le confort**, jamais l'exclusivité de puissance. Tout héros est obtenable gratuitement ; le payant va plus vite. ARPU cible porté par la conversion large à petits prix (packs < 10 €) plutôt que par les whales uniquement.

## Monnaie premium

- **Diamants d'Astérite** : achetés en argent réel (paliers 0,99 € → 99,99 €), aussi gagnés en jeu généreusement (~300-500/jour actif). Servent à : invocations, tickets bonus, butin AFK instantané, accélérations, boutique.
- Distinction **diamants gagnés / diamants payés** en interne (analytics), identiques pour le joueur.

## Packs débutants

- **Pack Premier Envol** (2,99 €) : valeur ×10 affichée — 10 invocations + héros Astral + 7 jours de bonus AFK. Conversion J1-J3.
- **Chaîne de packs de progression** : offres contextuelles déclenchées par jalons (chapitre 5 franchi, premier Légendaire, premier mur) — toujours en rapport avec ce que le joueur vient de vivre.
- **Pack 30 jours débutant** (4,99 €) : Légendaire au choix livré en 7 connexions (rétention + conversion).

## Battle pass — « Le Pass du Voyageur »

- Saison de 30 jours, piste gratuite + piste premium (9,99 €) + premium+ (19,99 € : +25 niveaux offerts + skin exclusif).
- Récompenses premium : invocations, essences d'ascension, skin de saison, **jamais de héros exclusif au pass**.
- XP de pass via les quotidiennes/hebdos (le pass récompense le jeu normal, il ne crée pas de grind dédié).

## Abonnement mensuel

- **Carte d'Aube** (4,99 €/mois) : 100 diamants/jour, +2 h de cap AFK, 1 butin instantané gratuit sup., skip des animations de donjon. Le meilleur ratio valeur/prix du jeu — produit de rétention avant tout.
- **Carte du Zénith** (14,99 €/mois) : idem + 300 diamants/jour, tickets doublés sur un donjon au choix, portrait animé exclusif.

## Invocations de héros

- Bannière permanente + bannière rotative (héros vedette up), pity transparent (voir §8).
- Packs d'invocations en promo hebdo (ex. 10 invocations à -20 % 1×/semaine) — l'offre d'habitude.

## Packs événementiels

À chaque événement bi-mensuel : pack thème (héros vedette en fragments + ressources, 9,99-29,99 €), cosmétique d'événement, et un petit pack à 1,99 € pour maximiser la conversion large.

## Skins cosmétiques

- Skins de héros (4,99-14,99 €) : nouvelle tenue + VFX d'ultime recolorés + parfois nouvelles répliques. **Stats : zéro** (ou +1 % symbolique universel type AFK Arena, à trancher selon le marché — recommandation : zéro stat, image de marque « fair F2P »).
- Cosmétiques d'île (décorations du Nid d'Aube), compagnons Lumioles, cadres de portrait, effets de victoire d'arène.

## Offres limitées

- Offres « 24 h » post-jalon (déjà citées), calendrier de packs de fête, offres de retour pour les churned (« votre équipe vous attend + pack -80 % »).
- **Règles d'éthique** : prix réels affichés, pas de fausse réduction permanente, probabilités publiées, plafond d'achat quotidien optionnel activable par le joueur (argument de réputation + conformité réglementaire UE).

## Garde-fous anti pay-to-win

1. Tout héros accessible F2P (pity + boutiques d'échange).
2. PvP par tranches de puissance + matchmaking par score, récompenses de rang à écart modéré (top 1 ≈ 3× le rang moyen, pas 50×).
3. Pas de stats payantes exclusives (pas d'équipement en boutique cash).
4. Le contenu PvE coop (guilde, Marée) valorise la participation, pas la puissance brute.
5. Les Mythiques montent lentement **pour tout le monde** (ressource temporelle non achetable en quantité).

---

# 8. Économie du jeu

## Monnaies principales

| Monnaie | Source | Usage |
|---|---|---|
| **Or** | AFK, campagne, donjon d'or | Niveaux, forge, enchantement |
| **Diamants d'Astérite** | Quêtes, succès, arène, achats | Invocations, tickets, confort |
| **Sceaux d'Invocation** | Événements, boutiques, drops | 1 sceau = 1 invocation permanente |
| **Lueurs d'Amitié** | Cadeaux d'amis | Invocations d'amitié (pool Commun/Éveillé/Astral) |
| **Jetons d'Arène / de Guilde / de Marée** | Modes respectifs | Boutiques dédiées |
| **Poussière d'étoile** | AFK, donjons | XP de héros au-delà du niveau 100 |

## Ressources d'amélioration

- **Essences d'Ascension** (par faction) : donjon du jour + boss de guilde — goulot volontaire de mi-parcours.
- **Fragments d'équipement** → forge ; **Pierres d'enchantement** ; **Sève de talents** (arbre de faction, source : campagne).

## Ressources rares (endgame)

- **Cœurs d'Astérite** (étoiles de Constellation) : Tour hauts étages, top raids, événements — jamais vendus directement.
- **Éclats de Lucens** : monnaie ultra-lente d'accès aux héros Lucens (boutique du Labo à 45 000 points type Idle Heroes, ou pity dédié).

## Système d'invocation et taux recommandés

**Bannière permanente** (300 diamants / 1 sceau ; ×10 = -10 %) :

| Rareté | Taux | Notes |
|---|---|---|
| Légendaire | **2,3 %** | dont héros vedette 25 % sur bannière rotative |
| Astral | 22 % | |
| Éveillé | 45 % | |
| Commun | 30,7 % | fourrage |

- **Pity doux** : taux Légendaire ×2 après 30 tirages sans Légendaire.
- **Pity dur** : Légendaire **garanti à 60 tirages** (compteur affiché en permanence — transparence).
- **Pity de vedette** : sur bannière rotative, 2e Légendaire = vedette garantie.
- **Boutique des Éclats** : chaque tirage donne 1 Éclat d'Invocation ; 150 Éclats = n'importe quel Légendaire permanent au choix (plafond de malchance absolu).

## Gestion des doublons

- Doublon = ressource d'Ascension (le cœur du modèle).
- Doublons excédentaires (héros déjà Stellaire) → **Autel du Retour** : reconversion en essences + Éclats d'Invocation, **remboursement intégral** des ressources investies dans un héros sacrifié (la liberté d'expérimenter est un pilier rétention).

## Boutiques

- **Boutique quotidienne** : 6 emplacements, re-roll gratuit 1×/jour ; toujours 1 « super affaire » (ex. Essence à -60 % en or) — l'habitude quotidienne.
- **Boutique de guilde** : essences, fragments de héros Astral sélectionnés, tickets de raid.
- **Boutique PvP** : fragments de 2 Légendaires en rotation de saison, équipement épique, cadres.
- **Boutique de Marée** : cosmétiques collectifs, Cœurs d'Astérite (très cher), consommables serveur.

**Principe d'équilibrage global** : chaque ressource a ≥ 2 sources gratuites et 1 source payante ; le joueur F2P actif obtient ~1 Légendaire garanti / 10-12 jours ; le payeur va 2-3× plus vite, jamais 10×.

---

# 9. Interface utilisateur

**Principe général** : une main, pouce droit, zéro frustration. Toute action quotidienne ≤ 3 taps. Badge rouge = uniquement les actions réellement rentables (pas de spam de pastilles).

## Écran d'accueil (hub — « Le Nid d'Aube »)

- Vue de l'île du joueur, ciel dynamique reflétant la progression, héros favoris qui se promènent (tap = réplique vocale).
- **Bas** : barre de navigation 5 onglets — Héros / Campagne (central, plus gros) / Boutique / Guilde / Menu.
- **Haut** : monnaies, avatar/VIP, événements en cours (carrousel discret).
- **Bouton flottant AFK** : coffre qui se remplit visuellement — toujours visible, satisfaction immédiate.
- Accès rapides contextuels (Marée dans 30 min = bannière douce, pas de popup bloquante).
- **Règle anti-pollution** : max 1 popup promotionnelle par session, jamais dans les 10 premières minutes de jeu d'une session.

## Écran de combat

- Lisibilité avant spectacle : barres de vie épaisses, jauges d'ultime sous les portraits (bas d'écran, zone pouce).
- Portraits tapables (mode Tactique) avec halo doré en « fenêtre dorée ».
- Haut : vitesse ×1/×2/×4, pause, auto on/off. Dégâts flottants désactivables.
- Victoire : butin en pluie + étoiles de performance (3 étoiles = bonus, incite au re-run).

## Écran des héros

- Grille de cartes, tri/filtres (faction, classe, rareté, niveau), barre de recherche.
- Fiche héros : full-art + stats + compétences (vidéo de l'ultime intégrée) + équipement en 4 slots tapables + onglets Ascension / Constellations / Histoire.
- **Bouton « Équiper tout » et « Améliorer optimal »** : l'auto-gestion pour les joueurs pressés.
- Comparateur avant/après sur chaque amélioration (le +127 ATK doit se voir en vert).

## Écran de récompenses AFK

- La Boussole d'Aube en plein écran, temps écoulé en grand, pluie d'objets à la réclamation, son + haptique calibrés.
- Boutons : Réclamer / **Butin instantané** (compteur gratuit du jour visible) / Détails des gains/minute (transparence qui motive à pousser la campagne).

## Écran de guilde

- Hall visuel avec blason, membres connectés visibles.
- 4 sections : Boss (jauge de PV du Dévoreur en vedette) / Boutique / Dons / Gestion.
- Chat persistant en overlay accessible partout via onglet latéral.

## Écran boutique

- Onglets : Quotidien / Packs / Invocations / Cosmétiques / Diamants.
- Chaque pack : contenu exact détaillé, valeur en diamants équivalents, taux d'invocation à 1 tap.
- Pas de fausse urgence agressive ; timers réels uniquement.

## Notifications importantes (push)

- AFK plein (12 h) : « Votre coffre déborde d'Astérite ! »
- Marée de Brume : 15 min avant (opt-in au premier événement vécu).
- Tickets non utilisés à 21 h ; cadeau de connexion à réclamer (1 rappel max/jour).
- Événement J-1 avant fin ; retour de raid de guilde.
- **Réglage granulaire par catégorie dès l'onboarding** (opt-in intelligent, pas de spam = désinstallation).

## Navigation

Architecture en étoile : tout part du hub, tout y revient en 1 tap (bouton maison persistant). Transitions < 300 ms, préchargement des écrans quotidiens, gestes : swipe horizontal entre héros dans la fiche, pull-to-refresh dans le chat.

---

# 10. Première version jouable / MVP

## Fonctionnalités indispensables (MVP = soft launch)

1. Boucle cœur : campagne auto-battle (10 chapitres, ~400 niveaux) + gains AFK avec cap 12 h + écran de réclamation soigné.
2. 30 héros jouables, 5 factions + boucle de contre, 6 classes.
3. Invocation (bannière permanente + pity affiché) + gestion des doublons (Ascension).
4. Niveaux + Résonance de niveau + équipement 4 slots + forge basique.
5. Arène asynchrone simple + Tour de l'Éveil + 4 donjons de ressources.
6. Quotidiennes + coffre d'activité + calendrier de connexion + boutique quotidienne.
7. Guildes v1 (chat, dons, boss de guilde simple).
8. Monétisation v1 : diamants, pack débutant, Carte d'Aube, battle pass simple.
9. Tutoriel des 5 premières minutes + push notifications + analytics complet (funnel, rétention, économie).

## À ajouter plus tard (post-soft launch)

Marée de Brume (v1.1 — dès que la masse critique de joueurs existe), Failles d'Écho roguelite (v1.2), Constellations + vignettes narratives (v1.2 — différenciateur majeur, à polir sans précipitation), tours de faction, Arène Suprême, mentorat, skins et décoration d'île, événements narratifs bi-mensuels, mode Épopée, héros Lucens/Mythiques.

## Nombre minimum de héros au lancement

- **30 héros au soft launch** : 5 par faction jouable (2 Légendaires, 2 Astrals, 1 Éveillé) + 5 Communs fourrage.
- **45-50 au lancement global**, puis **+2 héros/mois** (1 vedette d'événement + 1 permanent).

## Campagne initiale

- Soft launch : **10 chapitres / 400 niveaux** (~3-4 semaines de progression joueur actif).
- Lancement global : **20 chapitres / 800 niveaux** + mode Épopée. Cadence live : +2 chapitres/mois.

## Systèmes à prototyper en priorité (ordre strict)

1. **Combat auto 5v5** (moteur, stats, énergie/ultimes, vitesse ×2) — tout en dépend.
2. **Boucle AFK** (calcul des gains offline, cap, écran de réclamation) — le cœur émotionnel.
3. **Économie de progression** (courbes XP/or/murs de puissance) — en spreadsheet simulée *avant* d'être codée ; simuler 90 jours de joueur F2P/payeur.
4. **Invocation + pity** (sensation, animation, taux).
5. Onboarding 5 minutes.

## Roadmap

### Mois 1-3 — Prototype & vertical slice
- M1 : moteur de combat + 10 héros en placeholder + simulation d'économie (spreadsheet).
- M2 : boucle AFK + campagne 3 chapitres + invocation + progression héros ; premier playtest interne.
- M3 : **vertical slice** : onboarding complet, 15 héros avec DA finale, hub, 5 chapitres, économie v1 branchée sur analytics. Décision go/no-go DA et fun de la boucle.

### Mois 4-6 — Alpha → Soft launch
- M4 : contenu ×3 (30 héros, 10 chapitres), arène, tour, donjons, guildes v1, quotidiennes.
- M5 : monétisation complète, LiveOps outillé (config à distance, events sans mise à jour), localisation FR/EN, closed beta (500-2 000 joueurs), itérations rétention D1/D7.
- M6 : **soft launch** (Canada/Philippines/pays nordiques — pratique standard), cibles : **D1 > 40 %, D7 > 15 %, D30 > 6-8 %** avant d'engager le budget marketing global.

### Mois 7-12 — Lancement global & live
- M7-8 : corrections économie/rétention issues du soft launch ; Marée de Brume ; contenu ×2 (chapitres 11-20, 45 héros) ; préparation UA (user acquisition).
- M9 : **lancement global** + premier événement narratif + saison d'arène 1.
- M10-12 : cadence live installée — 1 événement/2 semaines, +2 héros/mois, +2 chapitres/mois, Constellations & vignettes (v1.2), Failles d'Écho, premier gros patch anniversaire des 100 jours (héros Lucens : Nhyx enfin obtenable — boucle bouclée avec le tutoriel).

### KPI de pilotage permanents
Rétention D1/D7/D30, durée et nombre de sessions/jour, conversion payante (cible 2-4 %), ARPDAU, taux de complétion du tutoriel, progression médiane par jour de vie du joueur, taux d'adhésion aux guildes à J7 (> 60 % = objectif santé sociale).

---

## Stack technique recommandée (note d'implémentation)

- **Moteur** : Unity (URP 2D) — standard du genre, pipeline Spine natif, builds iOS/Android.
- **Backend** : serveur autoritaire pour l'économie et le PvP asynchrone (Nakama, PlayFab ou custom Node/Go) ; les gains AFK sont **calculés côté serveur au retour du joueur** (anti-triche), jamais simulés en continu.
- **LiveOps** : configuration à distance obligatoire dès le MVP (événements, taux, boutique modifiables sans soumission aux stores).
- **Analytics** : funnel d'onboarding instrumenté étape par étape dès le premier build de test.

---

*Fin du document — ASTRIA v1.0. Prochaines étapes suggérées : maquettes UI des 5 écrans clés, spreadsheet d'économie simulée sur 90 jours, prototype Unity du combat 5v5.*
