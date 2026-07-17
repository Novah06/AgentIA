# Création des comptes clients (sans inscription publique)

Metria fonctionne comme un logiciel d'entreprise : il n'y a **pas d'inscription
sur le site**. Lorsqu'un client souscrit l'abonnement, son compte est créé en
interne avec les identifiants convenus, puis il se connecte simplement sur
`/sign-in`. Chaque compte ne voit que ses propres projets.

## 1. Verrouiller les inscriptions dans Clerk (à faire une fois)

1. Ouvrir le [dashboard Clerk](https://dashboard.clerk.com) → votre application.
2. **Configure → Restrictions** : passer le *Sign-up mode* en **Restricted**.
   Plus personne ne peut créer de compte lui-même, même en appelant l'API.
3. **Configure → Email, phone, username** : activer *Email address* +
   *Password* comme méthode de connexion (désactiver les réseaux sociaux si
   vous voulez un accès uniquement par identifiants fournis).

## 2. Créer le compte d'un nouveau client (à chaque souscription)

1. Dashboard Clerk → **Users** → **Create user**.
2. Renseigner l'adresse e-mail du client et le mot de passe convenu avec lui
   (il pourra le changer ensuite depuis le menu « Mon compte » dans l'app).
3. Communiquer les identifiants au client : il se connecte sur
   `https://votre-domaine/sign-in` et arrive directement sur son espace
   `/studio`, vide et isolé des autres clients.

## 3. Suspendre ou résilier un client

- **Suspendre** (impayé, fin d'essai) : Users → sélectionner l'utilisateur →
  **Ban user**. La connexion est bloquée, les données restent en base.
- **Résilier définitivement** : supprimer l'utilisateur dans Clerk, puis
  supprimer ses lignes `studio_projects` (owner_id = ID Clerk de
  l'utilisateur) et ses fichiers du bucket `studio-docs` dans Supabase.

## Évolution possible

Quand le nombre de clients grandira, une page d'administration interne
(protégée, réservée à votre compte) pourra créer les comptes via l'API
Clerk (`POST /users`) sans passer par le dashboard — à développer le moment
venu.
