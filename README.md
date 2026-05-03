# SocialBoost AI

L'IA qui **idée, rédige, adapte, planifie et publie** du contenu sur Instagram, TikTok, LinkedIn, X et Facebook. Pour créateurs solo, TPE et micro-agences.

> **Publie moins, gagne plus.**

## Promesse produit

- **1 mois de contenu en 10 minutes** (vs 15 h à la main).
- **+37 % d'engagement** moyen sur les 90 premiers jours.
- **Ton style, ta voix** : l'IA apprend des meilleurs posts de l'utilisateur.

## Vision 12 mois

3 000 payants · 75 k€ MRR · LTV/CAC ≥ 3.

## Stack technique

- **Framework** : Next.js 14 (App Router) — SSR/SSG pour le SEO B2C.
- **Langage** : TypeScript.
- **UI** : Tailwind CSS + shadcn/ui + Lucide icons.
- **Auth + DB + Storage** : Supabase (Postgres avec RLS).
- **IA** : Claude API (Anthropic SDK) avec prompt caching.
- **Paiement** : Stripe (Checkout + Customer Portal + webhooks).
- **Jobs** : Inngest pour la publication planifiée et les ingestions stats.
- **Observabilité** : Sentry + PostHog.
- **Déploiement** : Vercel.

> Voir [`CLAUDE.md`](CLAUDE.md) pour les conventions de code et les règles de sécurité (notamment : aucun secret côté client).

## Documentation produit

- [Roadmap](docs/roadmap.md) — phases, jalons, tâches produit & implémentation.
- [PRD Growth](docs/PRD.md) — personas, user stories, KPIs growth, risques.
- [Content Engine](docs/content-engine.md) — workflows IA, règles qualité, feedback loops.
- [Pricing & Packaging](docs/pricing.md) — plans, Stripe, upsells, UX page pricing.
- [Landing Page](docs/landing-page.md) — copy complet prêt à implémenter.

## Démarrage rapide

### Prérequis

- Node.js ≥ 20
- pnpm (recommandé) ou npm
- Compte Supabase (projet créé)
- Clé API Anthropic
- Compte Stripe (test mode pour le dev)

### Installation

```bash
git clone https://github.com/yannicke819-max/-SocialBoost-AI-.git
cd -SocialBoost-AI-
pnpm install
cp .env.example .env.local
# Remplir .env.local avec tes clés
pnpm dev
```

L'app démarre sur http://localhost:3000.

### Migration de la base

```bash
# Avec la CLI Supabase
supabase db push
# ou applique manuellement supabase/migrations/0001_initial_schema.sql
```

## Architecture

```
.
├── app/                    # Routes Next.js (App Router)
│   ├── (marketing)/        # Landing publique (SSG)
│   ├── (app)/              # App authentifiée (RSC + client)
│   └── api/                # Routes serveur (proxy IA, webhooks Stripe)
├── components/             # UI partagée (shadcn-style)
├── lib/
│   ├── supabase/           # Clients server + browser
│   ├── anthropic.ts        # Client Claude (server-only)
│   └── providers/          # Abstractions OAuth + publication par plateforme
├── prompts/                # Prompts versionnés
├── supabase/migrations/    # Schémas DB (SQL)
└── docs/                   # Documentation produit
```

## Plans

| Plan | Prix /mois | Comptes sociaux | Posts IA /mois |
|---|---|---|---|
| Free | 0 € | 1 | 10 |
| **Creator** ⭐ | 14,90 € | 3 | 100 |
| Pro | 29,90 € | 6 | 400 |
| Agency | 79,90 € | 20 | 1 500 |

Essai 7 jours sans CB sur Creator. Annuel –20 %.

## Sécurité & conformité

- Conformité RGPD, hébergement EU.
- Aucun secret IA / Stripe / OAuth en clair côté navigateur — tout passe par les routes API serveur.
- Tokens OAuth chiffrés en base via Supabase Vault.
- Logs d'audit sur les actions de publication (compatible AI Act).

## Licence

Propriétaire. Tous droits réservés.
