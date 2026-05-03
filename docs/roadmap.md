# Roadmap — SocialBoost AI

Roadmap structurée pour un MVP rapide et une montée en puissance progressive.

## Définition du MVP (honnête)

Un MVP B2C SaaS = **a minima** : auth + DB + 1 OAuth réseau social + 1 publication réelle + 1 plan payant fonctionnel. Sans ça c'est un prototype, pas un MVP — impossible de tester les hypothèses du PRD.

**Critère de "MVP done"** : un utilisateur peut s'inscrire, connecter son compte LinkedIn, générer un post via l'IA, le planifier, le voir publié, voir ses stats à J+1, et passer au plan Creator via Stripe.

## Phase 0 — Cadrage & fondations (Semaines 1 – 2)

**Jalon** : vision validée, scaffold Next.js opérationnel, schéma DB en place.

### Côté produit
- Rédiger un Product One-Pager (problème, ICP, promesse). ✓
- Définir 3 personas (Léa la créatrice, Marc la TPE, Sofia l'agence). ✓
- Cartographier 5 Jobs-To-Be-Done prioritaires. ✓
- Benchmark rapide (Buffer, Hootsuite, Later, Metricool, Publer). ✓

### Côté implémentation (✓ = fait)
- ✓ `CLAUDE.md`, README, conventions, structure de dossiers.
- ✓ Scaffold Next.js 14 + TypeScript + Tailwind + Supabase clients + Anthropic SDK.
- ✓ Schéma DB initial : `profiles`, `social_accounts`, `posts`, `analytics_snapshots`, `ai_suggestions` (avec RLS).
- ✓ Route API `/api/ai/generate` (proxy Claude server-side, secrets jamais exposés côté client).
- À faire : déploiement Vercel, projet Supabase provisionné, Sentry + PostHog.

## Phase 1 — Planification & génération de contenu (Semaines 3 – 6)

**Jalon** : un utilisateur génère, édite et planifie un post en moins de 3 minutes.

- Inputs onboarding : niche, ton, objectif, interdits, références.
- Workflow : Idée → Brouillon → Validation → Publication → Post-mortem.
- Calendrier éditorial multi-plateforme (drag-and-drop).
- Adaptation automatique par plateforme (variantes par canal).
- Mode batch : 1 semaine / 1 mois en un clic.
- Prompts versionnés dans `/prompts/` + prompt caching Anthropic.

## Phase 2 — IA de suggestion (Semaines 5 – 8, parallèle)

**Jalon** : les suggestions s'améliorent visiblement avec l'usage.

- Sources : tendances, historique performance, audience, calendrier.
- Anti-spam : score originalité, blacklist LLM, diversité forcée.
- Boucle de feedback : top posts → few-shot, bandit simple pour explorer formats.
- Worker `performance_ingester` (cron horaire).

## Phase 3 — Intégrations multi-plateformes (Semaines 6 – 10)

**Jalon** : publication native sur 3 plateformes en MVP, 6 à T+3 mois.

- MVP : Instagram Business, LinkedIn, X/Twitter.
- V1.1 : Facebook Pages, TikTok Content Posting API.
- V1.2 : YouTube Shorts, Threads, Pinterest.
- Interface générique `SocialProvider { auth, publish, schedule, fetchMetrics, getLimits }`.
- File d'attente (Inngest) avec retry exponentiel + DLQ.
- Tokens chiffrés (KMS / Supabase Vault).
- Tracker de quotas par user + plateforme.

## Phase 4 — Tableau de bord & recommandations (Semaines 9 – 12)

**Jalon** : l'utilisateur comprend ses perfs en moins de 30 s.

- Top ligne : 3 KPIs max (croissance, engagement, reach).
- Détail par post : impressions, reach, likes, commentaires, partages, saves, clics.
- Langage naturel, cards narratives, Boost Score 0 – 100.
- Recos IA actionnables (boutons d'action, pas de texte seul).
- Digest hebdo + export PDF.

## Phase 5 — Monétisation (en parallèle dès Phase 0)

- 4 plans : Free / Creator 14,90 € / Pro 29,90 € / Agency 79,90 €.
- Stripe Checkout + Customer Portal.
- Feature gating simple (`canUse('ai_post', user)`).
- Essai 7 jours sans CB sur Creator.
- Annuel –20 %.

## Phase 6 — Tests utilisateurs & lancement (Semaines 10 – 14)

### MVP "done"
Connecter 1 compte, générer 5 posts, en publier 1, voir les stats à J+1.

### Hypothèses (beta ≥ 20 utilisateurs)
- **H1** Temps gagné : ≥ 70 % rapportent ≥ 3 h/semaine.
- **H2** Engagement : posts IA ≥ baseline user sur 14 jours.
- **H3** Satisfaction : NPS ≥ 40, conversion free→paid ≥ 6 %.
- **H4** Rétention : D30 ≥ 35 %.

### Stratégie de lancement
- Semaines -4 à 0 : waitlist (landing + referral).
- Launch Day : Product Hunt + LinkedIn founders + 10 ambassadeurs.
- Dogfooding : SocialBoost publie son propre lancement avec son propre outil.
- Offre early-bird : –40 % à vie pour les 200 premiers.
- Communautés : Indie Hackers, r/socialmedia, Discord créateurs FR.

## Principes transverses

### UX B2C
- Onboarding ≤ 90 s avant 1er post généré.
- Une action principale par écran.
- Zero jargon.
- Mobile-first.
- Undo partout (annuler publication dans les 5 min).

### Technique
- Observabilité dès J1 : Sentry + PostHog.
- Prompt caching Anthropic (coûts ÷ 5 – 10).
- Queue + idempotence sur toutes les publications.
- Feature flags pour rollout progressif.
- E2E Playwright sur "générer → planifier → publier".
- CI/CD GitHub Actions + preview deploys Vercel.
