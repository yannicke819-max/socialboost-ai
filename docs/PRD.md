# PRD Growth — SocialBoost AI

## 1. Résumé exécutif

SocialBoost AI est un SaaS B2C qui transforme un créateur ou un petit business en "média solo" grâce à un moteur IA qui **idée, rédige, adapte, planifie et publie** sur 6 réseaux sociaux.

**Différenciation**
- Simplicité radicale : 1er post en moins de 3 minutes.
- IA personnalisée : apprend le style de l'utilisateur à partir de ses références.
- Pricing agressif vs Hootsuite / Buffer / Later.

**Objectif 12 mois** : 3 000 payants, 75 k€ MRR, LTV/CAC ≥ 3.

## 2. Problème & opportunité

### Créateurs
- Publier régulièrement prend 8 à 15 h / semaine → burnout, abandon après 3 mois.
- Angoisse de la page blanche, pas de stratégie data-driven.
- Outils existants pensés pour community managers pros, pas pour solos.

### TPE / e-commerce
- Pas les moyens d'une agence (1 500 – 5 000 €/mois).
- Community management sous-traité à un assistant qui n'a pas le temps.
- Aucune mesure claire du ROI social.

### Marché
- 50 M+ créateurs dans le monde (SignalFire), TAM creator tools ≈ 14 Md $.
- Vague IA générative : attentes élevées, coût d'acquisition de contenu ÷ 10.
- Fenêtre : les gros players (Buffer, Later) pivotent lentement vers l'IA.

## 3. Personas & cas d'usage

### Personas
- **Léa, 26 ans, créatrice lifestyle** — 18 k IG, 8 k TikTok. Cherche à monétiser via sponsoring. Paie 15 – 30 €/mois volontiers.
- **Marc, 42 ans, gérant boutique déco** — veut des leads et des ventes Shopify. Paie 30 – 50 €/mois si ROI visible.
- **Sofia, 31 ans, micro-agence (3 clients)** — veut scaler sans embaucher. Paie 80 – 150 €/mois.
- **Karim, 29 ans, coach business** — vend des formations, besoin de LinkedIn + IG + newsletter. 20 – 40 €/mois.

### User stories orientées engagement & revenu
1. En tant que créatrice, je veux **générer 1 mois de contenu en 10 min** pour ne plus sauter de semaine. *(rétention)*
2. En tant que gérant TPE, je veux savoir **quel post a généré des clics vers ma boutique** pour doubler ce qui marche. *(LTV)*
3. En tant que coach, je veux **recycler mon podcast en 10 posts** pour rentabiliser 1 h d'enregistrement. *(activation)*
4. En tant que créatrice, je veux que l'IA **imite mon ton** pour ne pas passer 20 min à réécrire. *(satisfaction → referral)*
5. En tant qu'agence, je veux **gérer 3 clients sous le même compte** avec des espaces séparés. *(ARPU)*
6. En tant que créateur, je veux recevoir chaque lundi **3 idées de posts basées sur les tendances de ma niche**. *(DAU)*
7. En tant que TPE, je veux un **score hebdo simple** ("tu fais mieux que 72 % des boutiques déco") pour comprendre sans analyser. *(WAU)*
8. En tant que créatrice, je veux **republier automatiquement mes 5 meilleurs posts tous les 90 jours**. *(rétention)*
9. En tant que coach, je veux **générer et planifier 1 séquence LinkedIn + IG de 7 jours** après chaque lancement produit. *(upsell quota)*
10. En tant qu'utilisateur gratuit, je veux voir mon **Boost Score monter** pour me motiver à upgrader. *(free → paid)*

## 4. Portée fonctionnelle

### MVP (V1.0)
- Auth email + Google.
- Onboarding 3 écrans (niche, ton, objectif).
- Connexion OAuth : Instagram Business, LinkedIn, X/Twitter.
- Générateur de posts IA (texte + hashtags).
- Éditeur + calendrier drag-and-drop.
- Publication immédiate et planifiée.
- Dashboard analytics basique (3 KPIs + liste posts).
- Abonnement Stripe (Free / Creator / Pro).

### V1.1 (M+2)
- Génération de visuels (Claude + modèle image).
- Repurposing long-form → posts.
- TikTok Content Posting + Facebook Pages.
- Recos IA hebdomadaires ("digest du lundi").

### V1.2 (M+4)
- YouTube Shorts, Threads, Pinterest.
- A/B tests de hooks.
- Mode agence multi-clients.
- Team seats.

### Hors scope
- DM automation (risque shadowban + réglementaire).
- Influencer marketplace.
- Analytics niveau entreprise.

## 5. UX & parcours

### Parcours d'activation — Time-to-First-Published < 5 min
1. **Landing → Sign-up** (30 s) : email ou Google, pas de CB.
2. **Onboarding** (90 s) : 3 questions + import d'un post existant pour apprendre le style.
3. **Connexion 1er compte social** (60 s) : OAuth LinkedIn par défaut (le plus rapide à approuver).
4. **Magic moment** (30 s) : 5 posts déjà générés attendent l'utilisateur.
5. **Première publication** (60 s) : 1 clic pour publier ou planifier.
6. **J+1 email** : "Ton post a fait X impressions, voici le prochain."

### Calendrier
- Vue semaine par défaut, pastilles colorées par plateforme.
- Drag pour re-planifier, clic pour éditer.
- Premier résultat visible → notification push/email à J+1 (déclencheur de retour).

## 6. KPIs Growth

| Étape funnel | KPI | Cible 3 mois | Cible 12 mois |
|---|---|---|---|
| Acquisition | Visite → signup | 5 % | 8 % |
| **Activation** | Signup → 1er post publié | 40 % | 60 % |
| Activation | Signup → 1 compte connecté | 55 % | 75 % |
| Engagement | DAU/WAU | 25 % | 40 % |
| Engagement | Posts planifiés / user actif / semaine | 5 | 12 |
| **Rétention** | D30 retention | 30 % | 45 % |
| Rétention | Churn mensuel payant | 8 % | 4 % |
| **Revenu** | Free → Paid | 4 % | 7 % |
| Revenu | ARPU mensuel | 18 € | 24 € |
| Revenu | MRR | 8 k€ | 75 k€ |
| Growth | Referral coefficient (K) | 0.2 | 0.5 |
| Growth | NPS | 35 | 50 |

**North Star Metric** : nombre de posts publiés via SocialBoost par semaine.

## 7. Risques & dérives

| Risque | Impact | Mitigation |
|---|---|---|
| Spam / contenu générique | Churn, bad reviews | Score d'originalité, blacklist de formules, diversité forcée |
| Shadowban plateformes | Perte de confiance | Rate limiting, pas de DM auto, watermark "IA" optionnel |
| Fatigue utilisateur (trop de notifs) | Churn | Max 2 emails/semaine, opt-out granulaire |
| Dépendance APIs tierces | Casse produit | Abstraction `SocialProvider`, fallback manuel |
| Coûts IA explosifs | Marges écrasées | Prompt caching, quotas par plan, Haiku sur tâches simples |
| Concurrence (Buffer AI, Later AI) | Pricing pressure | Vitesse produit, niche créateurs FR/EU d'abord |
| Réglementaire (AI Act, DSA) | Friction | Mention "contenu IA" activable, logs d'audit |
| Support submergé | NPS ↓ | Helpdesk IA niveau 1, docs vidéo |
