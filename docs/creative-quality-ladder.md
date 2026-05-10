# Creative Quality Ladder (AI-017D)

This is the SocialBoost-grade rubric behind the four creative quality
tiers shipped in AI-017C (`safe` / `social_proof` / `performance` /
`breakthrough`). Each tier maps to a proven social-ad strategy, not to
a generic technical label like *draft / standard / premium* — those
are deliberately not used in the media model.

The ladder lives as data in
`lib/offer-workspace/creative-quality-tiers.ts` (`CREATIVE_LADDER` +
`CREATIVE_SCORE_HINTS_BY_TIER` + `CREATIVE_RULES_BY_TIER`) so the UI,
the entitlements layer, and any future media gateway share a single
source of truth.

## Score hints — six axes, five discrete levels

Levels: `low` · `medium` · `high` · `very_high` · `needs_review`.

| Axis | safe | social_proof | performance | breakthrough |
|---|---|---|---|---|
| attention | medium | medium | high | very_high |
| clarity | high | high | high | medium |
| credibility | medium | high | medium | medium |
| conversionIntent | medium | medium | high | high |
| distinctiveness | low | medium | medium | very_high |
| brandSafety | high | high | medium | **needs_review** |

`needs_review` is the explicit signal that a tier requires human
sign-off before any future real provider call. Today, only
`breakthrough` carries that level on `brandSafety`.

## Strategy rules — kebab-cased, per tier

```
safe          single-message · benefit-led · no-aggressive-claim ·
              brand-safe-visual

social_proof  human-first · product-in-use · proof-without-fabrication ·
              no-fake-testimonial · ugc-compatible

performance   hook-first-2s · objection-handling · explicit-cta ·
              mobile-first · product-visible-early

breakthrough  pattern-interrupt · emotional-contrast · unusual-angle ·
              memorable-visual · human-review-required ·
              never-automatic-video
```

## Per-tier matrix

### safe

- **Objectif**: communiquer un bénéfice clair sans risque de marque,
  pour audiences nouvelles ou marchés réglementés.
- **Quand l'utiliser**: lancement, audience peu informée, marque
  prudente, vertical réglementé (santé, finance, éducation).
- **Structure créative**: un seul message principal · visuel
  reconnaissable · CTA simple · preuve courte ou source citée si
  chiffre.
- **Signaux de performance**: CTR stable · taux de complétion vidéo
  correct · baisse du coût d'apprentissage de campagne.
- **Risques**: sous-performance vs créatifs plus distinctifs ·
  banalisation visuelle si répétée trop longtemps.
- **Guardrails**: `no-aggressive-claim`, `brand-safe-visual`, no
  guaranteed-results promise, no medical/financial absolute claim.
- **Exemple de prompt directionnel** (non génératif) : *"Image plan
  moyen, lumière douce, sujet humain au travail, texte court, palette
  neutre."*

### social_proof

- **Objectif**: activer le déclencheur "des gens comme moi
  l'utilisent" avec témoignage authentique ou usage réel.
- **Quand l'utiliser**: audience sceptique, bouche-à-oreille fort,
  communauté active, créateurs / UGC à disposition.
- **Structure créative**: humain au centre · contexte d'usage réel ·
  citation courte ou voix off authentique · CTA secondaire simple.
- **Signaux de performance**: lift en credibility surveyed ·
  augmentation du taux de partage / save · CPL plus stable sur
  audiences froides.
- **Risques**: effet inverse si la preuve semble fabriquée · risque
  légal sur consentement non documenté.
- **Guardrails**: `no-fake-testimonial`, `proof-without-fabrication`,
  consentement écrit pour tout visage humain, avant/après uniquement
  si mesurable et non trompeur.
- **Exemple de prompt directionnel** (non génératif) : *"Plan moyen,
  client réel, regard caméra, légende courte 'Pourquoi je l'utilise'."*

### performance

- **Objectif**: maximiser conversion sur trafic payant — hook fort,
  bénéfice immédiat, CTA explicite.
- **Quand l'utiliser**: acquisition payante, retargeting,
  bottom-funnel, A/B testing de hooks et CTAs.
- **Structure créative**: hook visuel ou textuel dans les 2 premières
  secondes · bénéfice principal énoncé immédiatement · une objection
  majeure adressée · CTA verbe + objet + délai concret · cadrage
  mobile-first 9:16 ou 4:5.
- **Signaux de performance**: CTR au-dessus de la baseline · CVR
  amélioré sur le hook A/B gagnant · CPM stable, ROAS au-dessus de la
  baseline.
- **Risques**: fatigue créative rapide si format unique · sur-promesse
  si CTA non aligné avec page d'arrivée.
- **Guardrails**: `hook-first-2s`, `objection-handling`,
  `explicit-cta`, `mobile-first`, `product-visible-early`.
- **Exemple de prompt directionnel** (non génératif) : *"9:16, hook
  visuel 0-2s, bénéfice 2-5s, CTA dernier seconde, contraste élevé,
  texte court."*

### breakthrough

- **Objectif**: stopper le scroll par un pattern interrupt, créer
  mémorisation distinctive vs concurrents.
- **Quand l'utiliser**: brand campaigns, launch hero,
  repositionnement, distinctiveness work — toujours avec review
  humaine.
- **Structure créative**: pattern interrupt visuel ou narratif ·
  angle inattendu · émotion forte sous guardrails · contraste visuel
  marqué · récit mémorable.
- **Signaux de performance**: recall non-aidé en hausse · partages
  organiques au-dessus de la moyenne · mention spontanée en
  commentaires.
- **Risques**: brand safety risk plus élevé · dérive émotionnelle ou
  claim ambigu · fatigue d'audience si non suivi par exécution propre.
- **Guardrails**: `human-review-required`, `never-automatic-video`,
  no medical/financial absolute claim, no deceptive before/after, no
  celebrity likeness, no copyrighted character.
- **Exemple de prompt directionnel** (non génératif) : *"Plan
  inattendu, contraste fort, métaphore visuelle, légende courte qui
  inverse l'attente."*

## What we deliberately do **not** use

- ~~draft~~, ~~standard~~, ~~premium~~ as media tier names. Those are
  generic technical labels, not creative strategies. The text-side
  `AiQualityTier` (`economy / standard / premium / expert`) in
  `ai-cost-model.ts` is a separate surface and is unaffected.
- No automatic `breakthrough` video for any plan. Only Agency has a
  `manual_review_required` path.

## Out of scope

- This PR adds **no** real image / video provider. The ladder is
  data; a future media gateway will consult it before any fetch.
- This PR adds **no** UI surface. The Creative Studio (AI-017B) keeps
  its current shape; tier-aware UI can be wired in a later sprint.
- AI-016E (smoke-test execution) remains **paused**. Issue #25
  (i18n FR/EN/IT/DE/ES) backlog is **untouched**.
