/**
 * Recommendations engine — pure deterministic rules.
 *
 * Given (offer, assets, slots), yields up to 8 actionable suggestions.
 * Each rule has a stable `ruleId`. The recommendation `id` is `${offerId}:${ruleId}`
 * so the user's status (todo/applied_mock/dismissed) survives recomputation.
 *
 * No model call. No randomness. AI-008b mock.
 */

import type { Asset, CalendarSlot, Offer, Recommendation, RecommendationPriority } from './types';

interface RuleCtx {
  offer: Offer;
  assets: Asset[];
  slots: CalendarSlot[];
  language: 'fr' | 'en';
}

interface RuleSpec {
  id: string;
  applies: (ctx: RuleCtx) => boolean;
  build: (ctx: RuleCtx) => {
    priority: RecommendationPriority;
    title: string;
    description: string;
    cta?: { label: string; href?: string; action?: string };
  };
}

const t = (
  lang: 'fr' | 'en',
  fr: string,
  en: string,
): string => (lang === 'en' ? en : fr);

const RULES: RuleSpec[] = [
  // 1. Confidence < 70 → ajouter une preuve
  {
    id: 'add_proof_low_confidence',
    applies: (c) => (c.offer.confidence_score ?? 0) < 70,
    build: (c) => ({
      priority: 'high',
      title: t(c.language, 'Ajoutez une preuve concrète', 'Add a concrete proof'),
      description: t(
        c.language,
        "Le score de confiance est sous 70. Une preuve vérifiable (résultat, durée, témoignage textuel) lèverait l'objection silencieuse.",
        'Confidence is below 70. A verifiable proof (outcome, duration, textual testimonial) would lift the silent objection.',
      ),
      cta: {
        label: t(c.language, 'Ouvrir le brief', 'Open brief'),
        href: `/ai/offers/${c.offer.id}#brief`,
      },
    }),
  },
  // 2. Aucun email asset → tester email
  {
    id: 'try_email_channel',
    applies: (c) => !c.assets.some((a) => a.kind === 'email'),
    build: (c) => ({
      priority: 'medium',
      title: t(c.language, 'Tester le canal email', 'Try the email channel'),
      description: t(
        c.language,
        "Aucun email n'est encore généré pour cette offre. Un email court à la base existante convertit souvent mieux qu'un post social.",
        'No email asset yet. A short email to your existing list often converts better than a social post.',
      ),
      cta: {
        label: t(c.language, 'Régénérer avec email', 'Regenerate with email'),
        href: `/ai/offer-brain?fromOffer=${c.offer.id}&platforms=email`,
      },
    }),
  },
  // 3. Aucun LinkedIn post
  {
    id: 'add_linkedin_post',
    applies: (c) => !c.assets.some((a) => a.kind === 'social_post' && a.channel === 'linkedin'),
    build: (c) => ({
      priority: 'medium',
      title: t(c.language, 'Créer un post LinkedIn', 'Create a LinkedIn post'),
      description: t(
        c.language,
        "Aucun post LinkedIn n'a été matérialisé. Sur les offres B2B services, c'est souvent le canal #1 de génération de leads.",
        "No LinkedIn post yet. For B2B services offers, it's often the #1 lead-generation channel.",
      ),
      cta: {
        label: t(c.language, 'Régénérer avec LinkedIn', 'Regenerate with LinkedIn'),
        href: `/ai/offer-brain?fromOffer=${c.offer.id}&platforms=linkedin`,
      },
    }),
  },
  // 4. CTA faible friction absent
  {
    id: 'add_low_friction_cta',
    applies: (c) =>
      !c.assets.some(
        (a) => a.kind === 'cta' && /awareness|low/i.test(a.body),
      ),
    build: (c) => ({
      priority: 'medium',
      title: t(
        c.language,
        'Ajoutez un CTA faible friction',
        'Add a low-friction CTA',
      ),
      description: t(
        c.language,
        "Tous tes CTAs convergent vers la décision. Un CTA d'awareness (résumé, démo, ressource gratuite) capture les indécis.",
        'All your CTAs converge to decision. A low-friction CTA (recap, demo, free resource) captures undecided visitors.',
      ),
      cta: {
        label: t(c.language, 'Voir les CTAs', 'See CTAs'),
        href: `/ai/offers/${c.offer.id}#assets`,
      },
    }),
  },
  // 5. Preuve peu visible → renforcer proof dans hero
  {
    id: 'reinforce_proof_in_hero',
    applies: (c) => {
      const hero = c.assets.find(
        (a) => a.kind === 'landing_section' && /hero/i.test(a.body),
      );
      const proofs = c.offer.brief.proofPoints ?? [];
      if (!hero || proofs.length === 0) return false;
      // Hero text doesn't include any proof_point token
      return !proofs.some((p) => hero.body.includes(p.split(' ')[0] ?? ''));
    },
    build: (c) => ({
      priority: 'low',
      title: t(c.language, 'Renforcer la preuve dans le hero', 'Reinforce proof in hero'),
      description: t(
        c.language,
        "Une preuve mentionnée dans le hero (sous-titre ou bandeau) dissipe l'incertitude en 5 secondes.",
        'A proof mentioned in the hero (subtitle or banner) dissipates uncertainty in 5 seconds.',
      ),
      cta: {
        label: t(c.language, 'Ouvrir landing assets', 'Open landing assets'),
        href: `/ai/offers/${c.offer.id}#assets`,
      },
    }),
  },
  // 6. Trop peu de canaux (1 ou 0)
  {
    id: 'diversify_channels',
    applies: (c) => (c.offer.brief.platforms?.length ?? 0) < 2,
    build: (c) => ({
      priority: 'medium',
      title: t(c.language, 'Diversifier les canaux', 'Diversify channels'),
      description: t(
        c.language,
        "Sur un seul canal, le risque d'audience-mismatch est élevé. Tester un 2e canal valide (ou invalide) ton positionnement plus vite.",
        'On a single channel, audience-mismatch risk is high. Testing a 2nd channel validates (or invalidates) your positioning faster.',
      ),
      cta: {
        label: t(c.language, 'Régénérer multi-canal', 'Regenerate multi-channel'),
        href: `/ai/offer-brain?fromOffer=${c.offer.id}`,
      },
    }),
  },
  // 7. Aucun asset approved
  {
    id: 'approve_first_asset',
    applies: (c) => c.assets.length > 0 && !c.assets.some((a) => a.status === 'approved'),
    build: (c) => ({
      priority: 'low',
      title: t(c.language, 'Approuver un premier asset', 'Approve a first asset'),
      description: t(
        c.language,
        'Aucun asset approuvé. Marquer ton meilleur hook ou angle comme « Approuvé » figerait la base de tes prochaines variations.',
        'No approved asset. Marking your best hook or angle as "Approved" would freeze the base for future variants.',
      ),
      cta: {
        label: t(c.language, 'Voir les assets', 'See assets'),
        href: `/ai/offers/${c.offer.id}#assets`,
      },
    }),
  },
  // 8. social_content goal sans calendrier
  {
    id: 'schedule_three_slots',
    applies: (c) => c.offer.goal === 'social_content' && c.slots.length < 3,
    build: (c) => ({
      priority: 'high',
      title: t(c.language, 'Planifier 3 créneaux', 'Schedule 3 slots'),
      description: t(
        c.language,
        "Objectif « social_content » sans calendrier. 3 slots étalés sur 2 semaines suffisent pour mesurer un signal.",
        'Goal is "social_content" but no calendar. 3 slots spread over 2 weeks is enough to read a signal.',
      ),
      cta: {
        label: t(c.language, 'Ouvrir le calendrier', 'Open calendar'),
        href: `/ai/offers/${c.offer.id}#calendar`,
      },
    }),
  },
];

export function deriveRecommendations(
  offer: Offer,
  assets: Asset[],
  slots: CalendarSlot[],
  language: 'fr' | 'en' = 'fr',
): Recommendation[] {
  const ctx: RuleCtx = { offer, assets, slots, language };
  const out: Recommendation[] = [];
  for (const rule of RULES) {
    if (!rule.applies(ctx)) continue;
    const built = rule.build(ctx);
    out.push({
      id: `${offer.id}:${rule.id}`,
      offerId: offer.id,
      ruleId: rule.id,
      priority: built.priority,
      title: built.title,
      description: built.description,
      cta: built.cta,
      status: 'todo',
    });
  }
  return out.slice(0, 8);
}

/** Pure helper used by tests to enumerate the available rule ids. */
export const RECOMMENDATION_RULE_IDS = RULES.map((r) => r.id);
