# Budgets et seuils numériques (fixés avant le code)

- Budget de frame : 60 fps sur mobile milieu de gamme ; DPR plafonné à 1,5 ; ≤ 12 unités
  animées + ≤ 40 textes flottants simultanés en combat ; zéro allocation notable dans la
  boucle (tableaux réutilisés/filtrés).
- Simulation : pas de temps fixe 100 ms, RNG seedé par (niveau, tentative) — combat déterministe.
- Combat : timeout 60 s = défaite ; énergie max 1000 ; crit 15 % ×1,6 ; bonus de faction +25 %.
- Économie : cf. data.js (BAL) — coûts de niveau 12·l^1.5, croissance ennemie 1,055^niveau,
  AFK 12 🪙/min × 1,07^niveau, plafond 12 h.
- Invocation : Légendaire 8,4 % + pity 30 ; Mythique 0,6 % + pity dur 80 ; affichés au joueur.
- Poids : chaque portrait ≤ 120 Ko (512 px JPEG q82) ; zip total ≤ 10 Mo.
