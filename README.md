# SynapseAI Workforce

Site vitrine + plateforme SaaS pour SynapseAI Workforce — agents IA autonomes (ARIA, NOVA, FELIX) pour PME françaises.

## Stack

- **Framework** : Next.js 14 (App Router) + TypeScript
- **UI** : Tailwind CSS (thème sombre cyan)
- **Auth** : Clerk
- **DB** : Supabase (PostgreSQL + Storage)
- **IA** : API Anthropic (Claude Sonnet, streaming)
- **Emails** : Resend

## Démarrage

```bash
npm install
cp .env.local.example .env.local   # renseigner les clés
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

Le site fonctionne en **mode démo** sans clés configurées : le formulaire de contact, l'auth Clerk et le chat Anthropic affichent des messages explicites quand les variables d'environnement manquent.

## Variables d'environnement requises

Voir `.env.local.example`. Pour activer toutes les fonctionnalités :

| Variable | Service |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Auth |
| `ANTHROPIC_API_KEY` | Chat agents |
| `NEXT_PUBLIC_SUPABASE_URL`, `*_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | DB + uploads |
| `RESEND_API_KEY`, `CONTACT_EMAIL` | Emails contact |

## Base de données

Schéma SQL Supabase dans [`lib/supabase/schema.sql`](lib/supabase/schema.sql). À exécuter dans l'éditeur SQL Supabase, puis créer un bucket Storage `uploads`.

## Architecture

```
app/
  page.tsx                  Site vitrine
  sign-in, sign-up          Auth Clerk
  dashboard/                Espace client
    page.tsx                Tableau de bord
    aria, nova, felix       Pages chat agent
    history, settings
  api/
    chat/route.ts           Streaming Anthropic
    contact/route.ts        Email Resend
    upload/route.ts         Upload + extraction
  legal/[slug]              Mentions, CGU, privacy
components/
  landing/                  Sections page d'accueil
  dashboard/                Navbar dashboard
  chat/                     Interface chat (sidebar + stream)
  ui/                       Logo, AgentAvatar, Reveal
lib/
  agents/                   Prompts ARIA/NOVA/FELIX + config
  anthropic/                Client SDK
  supabase/                 Client + schema SQL
```

## Agents

Les prompts (`lib/agents/prompts.ts`) sont intégrés mot pour mot depuis la spécification SynapseAI v2.0. Ils embarquent :

- **ARIA** — Finance : protocole `<reflexion>`, scratchpad financier, niveaux de certitude, réforme 2026.
- **NOVA** — RH : grille scoring /10, vérification anti-discrimination, droit du travail.
- **FELIX** — Office : matrice priorité, alertes contrats J-90 → J-7, refus courriers avocats.

Le contexte client (entreprise, secteur, ville, seuils) est injecté dans le prompt à chaque requête via `buildSystemPrompt()`.

## Déploiement

Compatible Vercel sans configuration additionnelle. Définir les variables d'environnement dans le dashboard du projet.
