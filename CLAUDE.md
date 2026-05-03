# CLAUDE.md — Conventions SocialBoost AI

Guide de référence pour Claude Code et tout contributeur.

## Stack

- **Framework** : Next.js 14 (App Router) + React 18 + TypeScript strict.
- **UI** : Tailwind CSS, composants `shadcn/ui` (à ajouter via CLI), `lucide-react`.
- **Backend** : Supabase (Postgres + Auth + Storage + Realtime) avec Row Level Security.
- **IA** : `@anthropic-ai/sdk` côté serveur uniquement, prompt caching activé.
- **Paiement** : Stripe SDK côté serveur, `@stripe/stripe-js` côté client (publishable key).
- **Jobs** : Inngest pour la publication planifiée et les ingestions stats.
- **Deploy** : Vercel (preview deploys par PR).
- **Test** : Vitest pour l'unitaire, Playwright pour l'E2E sur le chemin critique.

## Structure de dossiers

```
app/
  (marketing)/         # Landing publique, pricing, blog (SSG)
  (app)/               # App authentifiée
  api/                 # Routes server-only (proxies IA, webhooks Stripe, OAuth callbacks)
components/            # UI partagée
lib/
  supabase/            # Clients server + browser
  anthropic.ts         # Client Claude server-only
  providers/           # Abstractions par plateforme sociale (LinkedIn, IG, X…)
  stripe.ts            # Helpers Stripe server-only
prompts/               # Prompts versionnés (markdown)
supabase/migrations/   # SQL versionné
docs/                  # Documentation produit
```

## Règles de sécurité — CRITIQUES

1. **Aucun secret en `NEXT_PUBLIC_*`.** Tout ce qui commence par `NEXT_PUBLIC_` finit dans le bundle navigateur.
2. **Clés autorisées côté navigateur** : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_APP_URL`. Point.
3. **Secrets server-only** (jamais préfixés `NEXT_PUBLIC_`) : `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, tous les `*_CLIENT_SECRET` OAuth.
4. **Appels Claude API uniquement depuis `app/api/*` ou Server Actions.** Jamais depuis un composant client.
5. **Tokens OAuth des utilisateurs chiffrés en base** via Supabase Vault ou pgcrypto. Jamais stockés en clair.
6. **RLS activé sur toutes les tables `public`.** Aucune table sans policy.
7. **Webhooks Stripe** : toujours vérifier la signature avec `STRIPE_WEBHOOK_SECRET`.

## Conventions de code

- TypeScript strict, `any` interdit (utiliser `unknown` + narrowing).
- Server Components par défaut, `"use client"` uniquement si interaction nécessaire.
- Imports : alias `@/*` pointant à la racine.
- Composants : un fichier par composant, nom en PascalCase.
- Hooks custom : préfixe `use`, dans `lib/hooks/`.
- Pas de commentaires sur ce que fait le code (les noms parlent). Commentaires uniquement sur le **pourquoi** non-évident.

## Conventions IA

- **Modèles** : `claude-sonnet-4-6` pour la génération qualité (rédaction posts, repurposing). `claude-haiku-4-5-20251001` pour les tâches simples (tagging, classification).
- **Prompt caching obligatoire** sur les system prompts longs (>1024 tokens). Utiliser `cache_control: { type: 'ephemeral' }`.
- **Prompts versionnés** dans `prompts/*.md` avec en-tête `version:`.
- **Aucune chaîne de prompt en dur** dans le code applicatif → toujours importée depuis `prompts/`.

## Commandes utiles

```bash
pnpm dev              # Démarre le dev server (port 3000)
pnpm build            # Build de production
pnpm start            # Démarre le build
pnpm lint             # ESLint
pnpm typecheck        # tsc --noEmit
pnpm test             # Vitest
pnpm test:e2e         # Playwright
supabase db push      # Applique les migrations
```

## Git workflow

- Branches feature : `feat/<scope>-<short-name>`.
- Branches Claude : `claude/<task-id>`.
- Commits : style impératif court ("Add X", "Fix Y"), pas de scope obligatoire.
- PR review obligatoire avant merge sur `main`.

## Ordre d'implémentation MVP

Voir [`docs/roadmap.md`](docs/roadmap.md). Objectif : un utilisateur peut s'inscrire, connecter LinkedIn, générer un post, le publier, voir ses stats à J+1, et upgrader via Stripe.
