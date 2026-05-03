# Pricing & Packaging — SocialBoost AI

## 1. Positionnement de prix

**Cible** : créateurs solo + TPE/e-com + micro-agences (1 – 5 clients).
**Positionnement** : **mass-market value**. Moins cher que Buffer/Later (6 – 15 € pour plan de base), premium vs outils IA génériques (ChatGPT Plus).
**Ancrage psychologique** : "moins qu'un abonnement Netflix".

**Rationale**
- Cible volume plutôt que prix premium (TAM créateurs FR 300 k+, TPE 2 M+).
- IA = coût marginal non nul → plans généreux à éviter.
- Concurrence gratuite (ChatGPT + publication manuelle) impose un ratio valeur/prix > 10.

## 2. Structure des plans

4 plans, axe principal = volume de posts IA + nombre de comptes.

| Plan | Free | **Creator** ⭐ | **Pro** | Agency |
|---|---|---|---|---|
| Cible | Test | Créateur solo | TPE / freelance | Micro-agence |
| Prix mensuel | 0 € | 14,90 € | 29,90 € | 79,90 € |
| Prix annuel (affiché /mois) | 0 € | 11,90 € (143 €) | 23,90 € (287 €) | 63,90 € (767 €) |
| Remise annuelle | — | –20 % | –20 % | –20 % |

## 3. Détails par plan

### Free — "Teste l'IA"
- 1 compte social
- **10 posts IA / mois**
- Calendrier basique (semaine)
- 1 plateforme (au choix)
- Watermark "Créé avec SocialBoost" sur visuels générés
- Support communautaire
- Pas de repurposing, pas d'analytics avancées

### Creator — 14,90 €/mois ⭐ (plan de référence)
- **3 comptes sociaux**
- **100 posts IA / mois**
- Toutes plateformes
- Calendrier complet + smart scheduling
- Repurposing (5/mois)
- Analytics basiques + Boost Score
- Génération de visuels : **20/mois**
- Support email 48 h

### Pro — 29,90 €/mois
- **6 comptes sociaux**
- **400 posts IA / mois**
- Repurposing illimité
- Analytics avancées + recos IA hebdo
- Génération de visuels : **100/mois**
- A/B tests (v1.2)
- Auto-refresh posts sous-performants
- Export PDF rapports
- Support chat prioritaire

### Agency — 79,90 €/mois
- **20 comptes sociaux** (multi-clients, espaces séparés)
- **1 500 posts IA / mois**
- 3 seats inclus
- White-label reports (add-on)
- API access (v1.2)
- Support dédié + onboarding 1:1

### Overages
- Post IA supplémentaire : 0,15 €/unité ou pack 50 = 5 €.
- Compte social supplémentaire : 3 €/mois.
- Génération visuel supplémentaire : 0,30 €/image.
- Notification à 80 % et 100 % du quota + bouton d'upgrade inline.

## 4. Recommandations Stripe

### Structure Products / Prices

```
Product: socialboost_free                 (no price, logical flag)
Product: socialboost_creator
  ├── price_creator_monthly_eur     14.90€ / month
  └── price_creator_yearly_eur      143€ / year  (shown as 11.90€/mo)
Product: socialboost_pro
  ├── price_pro_monthly_eur         29.90€ / month
  └── price_pro_yearly_eur          287€ / year  (shown as 23.90€/mo)
Product: socialboost_agency
  ├── price_agency_monthly_eur      79.90€ / month
  └── price_agency_yearly_eur       767€ / year  (shown as 63.90€/mo)

Add-ons:
Product: addon_social_account        price_addon_account_monthly_eur      3€/mo
Product: addon_posts_pack_50         price_addon_posts_50_eur             5€ one-shot
Product: addon_images_pack_50        price_addon_images_50_eur           12€ one-shot
Product: addon_seat                  price_addon_seat_monthly_eur        12€/mo (Agency)

Metered: usage_record sur `posts_overage` et `images_overage` (facturation fin de cycle).
```

### Essai & coupons
- **Essai 7 jours sur Creator** (sans CB pour réduire friction, avec email vérifié + device fingerprint pour limiter l'abus).
- **Pas de trial Pro/Agency** (intent signal fort, trial = friction inutile).
- Coupons :
  - `LAUNCH40` → –40 % à vie, 200 premiers (Product Hunt).
  - `CREATOR20` → –20 % 3 mois (ambassadeurs).
  - `STUDENT50` → –50 % sur preuve étudiante.
  - `WINBACK30` → –30 % 2 mois pour churners.

### Webhooks Stripe critiques
- `customer.subscription.created/updated/deleted` → maj table `subscriptions`.
- `invoice.payment_failed` → email + grace period 5 j avant downgrade.
- `customer.subscription.trial_will_end` → email J-2 avec social proof.

## 5. Upsell & add-ons

### Upsell naturel
- **Free → Creator** : trigger à 8/10 posts utilisés ("plus que 2 posts cette semaine").
- **Creator → Pro** : trigger sur "besoin de repurposing illimité" ou ajout du 3e compte.
- **Pro → Agency** : trigger sur 7e compte ou demande multi-utilisateurs.

### Add-ons à la carte
- **Slots comptes supplémentaires** : +3 €/mois par compte.
- **Pack "Saison"** : 50 posts pré-faits (Noël, St-Valentin, Rentrée) à 9 €.
- **Audit social 1:1** (humain) : 89 € ponctuel.
- **Content boost** : pack 200 posts IA → 19 €.
- **Génération vidéo** (v2) : crédits à 0,50 €/clip.

## 6. UX page pricing

### Maximiser la conversion
- **3 plans visibles par défaut** (Agency masqué derrière "Je gère plusieurs clients").
- **Creator en "Most popular"** avec badge + fond teinté.
- **Toggle mensuel/annuel** visible en haut, **annuel sélectionné par défaut**.
- Barre d'économie annuelle : "Économise 36 €/an".
- **CTA textuels différenciés** : "Commencer gratuitement" / "Essayer 7 jours" / "Choisir Pro".

### Réduire la confusion
- Max **5 – 7 lignes de features par plan**.
- Features cochées/décochées avec tooltip pour détails.
- Tableau comparatif complet **en dessous**, pas au-dessus.
- FAQ pricing juste après : "Que se passe-t-il si je dépasse mon quota ?", "Puis-je changer de plan ?", "Remboursement ?".

### Preuve sociale au milieu
- Logos médias + 3 testimonials vidéo de créateurs.
- Compteur live : "24 382 posts publiés cette semaine via SocialBoost".

### Trust signals en pied
- "Annulation en 1 clic" • "Sans engagement" • "Paiement sécurisé Stripe".
