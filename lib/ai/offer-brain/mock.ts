/**
 * Offer Brain — deterministic mock.
 *
 * Returns a structurally valid OfferBrief that REFLECTS the input where possible,
 * so tests can assert business behavior (caps, missing-proof flagging, channel
 * relevance, follow-up questions) without calling a real LLM.
 *
 * Used by:
 *   - CI (always)
 *   - Production when OFFER_BRAIN_USE_REAL_MODEL !== 'true'
 *   - Production fallback if ANTHROPIC_API_KEY is missing
 *
 * Determinism: same input always produces same output. No randomness.
 */

import type { OfferBrainInput } from './schema';
import {
  type OfferBrief,
  DIAGNOSTIC_VERSION,
  PROMPT_VERSION,
  SCHEMA_VERSION,
} from './schema';

type Platform = 'linkedin' | 'instagram' | 'x' | 'tiktok' | 'facebook';

function inferOfferType(input: OfferBrainInput): OfferBrief['identification']['offer_type'] {
  const text = `${input.raw_offer_text} ${input.current_offer_name ?? ''}`.toLowerCase();
  if (/coach|coaching|mentor|programme.*\b(consultant|coach|client)|program.*\b(consultant|coach|client)/.test(text)) return 'coaching';
  if (/cours|course|formation|bootcamp|cohorte|cohort|training|module/.test(text)) return 'course';
  if (/audit|diagnos/.test(text)) return 'audit';
  if (/webinar|webinaire/.test(text)) return 'webinar';
  if (/newsletter/.test(text)) return 'newsletter';
  if (/agence|agency/.test(text)) return 'agency-service';
  if (/membership|membres|abonn/.test(text)) return 'membership';
  if (/saas|app|tool|platform|software|gestionnaire|manager|trial/.test(text)) return 'service';
  if (/produit|product|capsule|collection|boutique|shop|vetement|fashion|clothing/.test(text)) return 'product';
  // Heuristic: "Programme N semaines" + B2B indicators → coaching
  if (/programme.*\bsemaines?\b|program.*\bweeks?\b/.test(text)) return 'coaching';
  return 'unknown';
}

function inferBusinessModel(input: OfferBrainInput): OfferBrief['identification']['business_model'] {
  const text = `${input.raw_offer_text} ${input.current_offer_name ?? ''}`.toLowerCase();
  if (/freemium|free tier|free plan/.test(text)) return 'freemium';
  if (/abonn|subscription|recurring|membership|monthly|mois\b|trial|saas|gestionnaire/.test(text)) return 'subscription';
  if (input.current_price !== undefined) {
    return 'one-time';
  }
  return 'unknown';
}

function inferPricePositioning(
  price: number | undefined,
  type: OfferBrief['identification']['offer_type'],
): OfferBrief['positioning']['price_positioning'] {
  if (price === undefined) return 'unclear';
  if (type === 'coaching' || type === 'course' || type === 'service' || type === 'agency-service') {
    if (price < 50) return 'budget';
    if (price < 300) return 'mid-tier';
    if (price < 1500) return 'premium';
    return 'luxury';
  }
  if (type === 'product') {
    if (price < 30) return 'budget';
    if (price < 150) return 'mid-tier';
    if (price < 500) return 'premium';
    return 'luxury';
  }
  return 'mid-tier';
}

function detectCTAStrength(input: OfferBrainInput): OfferBrief['conversion']['cta_strength'] {
  const cta = input.desired_cta?.toLowerCase() ?? '';
  if (!cta) return 'absent';
  if (/calendly|book|réserver|reserva|prenota|buchen|signup|s'inscrire|inscribirse|register/.test(cta)) return 'strong';
  if (/learn more|en savoir plus|saber más|scopri/.test(cta)) return 'weak';
  if (cta.length > 5) return 'medium';
  return 'weak';
}

function inferChannels(
  input: OfferBrainInput,
  offerType: OfferBrief['identification']['offer_type'],
): { best: Platform[]; rationale: Partial<Record<Platform, string>> } {
  const text = input.raw_offer_text.toLowerCase();

  // Heuristics — deterministic based on offer type and surfaced platforms
  if (input.target_platforms?.length) {
    const rationale: Partial<Record<Platform, string>> = {};
    for (const p of input.target_platforms) {
      rationale[p] = `Selected by user explicitly via target_platforms hint.`;
    }
    return { best: input.target_platforms.slice(0, 5) as Platform[], rationale };
  }

  const isVisualProduct =
    offerType === 'product' &&
    (/fashion|beaut|déco|deco|food|lifestyle|capsule|vestiaire|coton|mode|vêtement|vetement|clothing|jewelry|accessories|bijou|cosmetic/.test(
      text,
    ) ||
      /femme|woman|women|donna|elles|her\b/.test((input.target_customer ?? '').toLowerCase()));

  if (isVisualProduct) {
    return {
      best: ['instagram', 'tiktok', 'facebook'] as Platform[],
      rationale: {
        instagram: 'Visual product, IG carousel + Reels native.',
        tiktok: 'Lifestyle product fits short-form video discovery.',
        facebook: 'Audience overlap for retargeting + community.',
      },
    };
  }

  if (offerType === 'coaching' || offerType === 'service' || offerType === 'audit' || offerType === 'agency-service') {
    return {
      best: ['linkedin', 'x'] as Platform[],
      rationale: {
        linkedin: 'B2B audience native to long-form authority content + lead-gen.',
        x: 'Thread-driven thought leadership amplifies LinkedIn reach.',
      },
    };
  }

  if (offerType === 'course' || offerType === 'webinar') {
    return {
      best: ['linkedin', 'instagram', 'x'] as Platform[],
      rationale: {
        linkedin: 'Educational/training audiences active on LinkedIn long-form.',
        instagram: 'Carousel-friendly for course teaser content.',
        x: 'Thread-driven curriculum previews work well.',
      },
    };
  }

  if (offerType === 'newsletter') {
    return {
      best: ['linkedin', 'x'] as Platform[],
      rationale: {
        linkedin: 'Newsletter-driven authority audience.',
        x: 'Thread → newsletter funnel works.',
      },
    };
  }

  return {
    best: ['linkedin'] as Platform[],
    rationale: { linkedin: 'Default fallback for B2B / professional audiences.' },
  };
}

function videoRelevance(
  channels: Platform[],
  offerType: OfferBrief['identification']['offer_type'],
): OfferBrief['channels']['video_relevance'] {
  if (offerType === 'product') return 'high';
  if (channels.includes('tiktok') || channels.includes('instagram')) return 'medium';
  if (channels.includes('linkedin') && !channels.includes('tiktok') && !channels.includes('instagram')) return 'low';
  return 'medium';
}

function avatarRelevance(
  videoR: OfferBrief['channels']['video_relevance'],
  offerType: OfferBrief['identification']['offer_type'],
): OfferBrief['channels']['avatar_video_relevance'] {
  // Avatar video is rarely high. It's a niche tool.
  if (offerType === 'coaching' || offerType === 'audit') return 'low';
  if (videoR === 'high') return 'medium';
  return 'low';
}

function carouselRelevance(
  channels: Platform[],
  offerType: OfferBrief['identification']['offer_type'],
): OfferBrief['channels']['carousel_relevance'] {
  if (offerType === 'product') return 'high';
  if (offerType === 'course' || offerType === 'webinar') return 'high';
  if (channels.includes('instagram') || channels.includes('linkedin')) return 'medium';
  return 'low';
}

function longFormRelevance(
  channels: Platform[],
  offerType: OfferBrief['identification']['offer_type'],
): OfferBrief['channels']['long_form_relevance'] {
  if (channels.includes('linkedin')) return 'high';
  if (offerType === 'newsletter' || offerType === 'service' || offerType === 'agency-service') return 'high';
  return 'medium';
}

export function offerBrainMock(input: OfferBrainInput): OfferBrief {
  const offerType = inferOfferType(input);
  const businessModel = inferBusinessModel(input);
  const pricePositioning = inferPricePositioning(input.current_price, offerType);
  const ctaStrength = detectCTAStrength(input);
  const { best: bestChannels, rationale: channelRationale } = inferChannels(input, offerType);

  const proofProvided = (input.proof_points?.length ?? 0) > 0 || (input.testimonials?.length ?? 0) > 0;
  const hasCTA = ctaStrength !== 'absent';
  const hasAudience = !!input.target_customer;
  const hasGoal = !!input.user_goal || !!input.campaign_goal;
  const hasPrice = input.current_price !== undefined;

  // Apply caps from schema rules
  const proof_score = proofProvided ? 70 : 30;                                   // ≤ 40 if no proofs
  const confidence_score = proofProvided ? 80 : Math.min(60, 70);                 // ≤ 70 if no proofs
  const conversion_readiness_score = hasCTA && ctaStrength === 'strong' ? 75 : Math.min(60, 70); // ≤ 70 if weak/absent CTA
  const audience_fit_score = hasAudience ? 70 : 50;
  const clarity_score = input.raw_offer_text.length > 100 ? 65 : 50;
  const differentiation_score = (input.landing_page_text?.length ?? 0) > 200 ? 60 : 45;
  const business_potential_score = Math.round(
    (proof_score + confidence_score + conversion_readiness_score + audience_fit_score + clarity_score + differentiation_score) / 6,
  );

  // Build follow-up questions (max 3, prioritized)
  const followups: string[] = [];
  if (!proofProvided) {
    followups.push("Quel résultat client vérifiable peux-tu citer (chiffre, témoignage nominatif, étude de cas) pour étayer la promesse ?");
  }
  if (!hasCTA) {
    followups.push("Quelle action exacte (lien Calendly, page Stripe, formulaire) doit déclencher cette campagne ?");
  }
  if (!hasAudience) {
    followups.push("Décris ta cible idéale en une phrase : qui paie, pourquoi, à quel prix ?");
  }
  if (followups.length < 3 && !hasGoal) {
    followups.push("Quel est l'objectif business mesurable de la campagne ce mois-ci ? (ventes / leads / autorité / audience)");
  }
  const recommendedFollowups = followups.slice(0, 3);

  // Missing categories
  const missingCategories: OfferBrief['learning_signals']['missing_data_categories'] = [];
  if (!proofProvided) missingCategories.push('proof');
  if (!hasAudience) missingCategories.push('audience');
  if (!hasCTA) missingCategories.push('cta');
  if (!hasPrice) missingCategories.push('pricing');
  if ((input.customer_objections?.length ?? 0) === 0) missingCategories.push('objections');
  if (!hasGoal) missingCategories.push('goal');

  const ambiguity = Math.min(100, missingCategories.length * 18);
  const extraction = 100 - ambiguity;

  const improvementPriority: OfferBrief['learning_signals']['improvement_priority'] =
    ambiguity >= 60 ? 'critical' : ambiguity >= 40 ? 'high' : ambiguity >= 20 ? 'medium' : 'low';

  // Assemble OfferBrief
  return {
    diagnostic_version: DIAGNOSTIC_VERSION,
    prompt_version: PROMPT_VERSION,
    schema_version: SCHEMA_VERSION,

    identification: {
      offer_name: input.current_offer_name ?? input.raw_offer_text.slice(0, 60).trim(),
      offer_type: offerType,
      business_model: businessModel,
      market_category: 'unspecified',
      offer_maturity: 'launched',
      core_promise: input.raw_offer_text.slice(0, 200).trim(),
      transformation_promised: 'Transformation déduite à valider avec l\'utilisateur.',
      primary_outcome: 'Outcome principal à clarifier.',
      secondary_outcomes: [],
    },

    audience: {
      target_audience: input.target_customer ?? 'Audience non spécifiée — à clarifier.',
      audience_segment: input.target_customer?.split(',')[0]?.trim() ?? 'unspecified',
      buyer_persona: input.target_customer ?? 'Persona non précisé.',
      awareness_stage: 'problem-aware',
      sophistication_level: 'medium',
      pain_points: [],
      urgent_triggers: [],
      desired_outcome: 'À clarifier avec l\'utilisateur.',
      buying_motivations: [],
      buying_objections: input.customer_objections ?? [],
    },

    positioning: {
      positioning_summary: 'Positionnement à formaliser sur la base de l\'input.',
      differentiation_points: [],
      perceived_value: hasPrice ? `Prix ${input.current_price} ${input.currency ?? 'EUR'}.` : 'Valeur perçue à clarifier.',
      price_positioning: pricePositioning,
      value_metric: 'À définir',
      category_alternatives: [],
      why_now_angle: 'À formuler.',
    },

    proofs: {
      proof_points: input.proof_points ?? [],
      proof_quality: proofProvided ? 'partial' : 'missing',
      proof_gaps: proofProvided ? [] : ['Aucune preuve quantifiée fournie dans l\'input.'],
      credibility_assets: [],
      risky_claims_detected: [],
      unsupported_claims: [],
    },

    conversion: {
      funnel_stage: hasCTA ? 'consideration' : 'awareness',
      cta: input.desired_cta ?? '',
      cta_strength: ctaStrength,
      conversion_path: input.desired_cta
        ? `Post → ${input.desired_cta}`
        : 'Conversion path à définir.',
      friction_points: hasCTA ? [] : ['Aucun CTA explicite identifié.'],
      recommended_offer_fix: hasCTA ? [] : ['Définir un CTA unique et trackable.'],
      recommended_lead_magnet: 'À identifier selon objectif.',
      recommended_next_action: hasCTA ? 'Construire la campagne autour du CTA existant.' : 'Définir le CTA avant toute campagne.',
    },

    channels: {
      best_channels: bestChannels,
      channel_rationale: channelRationale,
      content_formats_likely_to_work: ['long-form-post', 'carousel-outline'],
      video_relevance: videoRelevance(bestChannels, offerType),
      avatar_video_relevance: avatarRelevance(videoRelevance(bestChannels, offerType), offerType),
      carousel_relevance: carouselRelevance(bestChannels, offerType),
      long_form_relevance: longFormRelevance(bestChannels, offerType),
    },

    intelligence: {
      business_potential_score,
      business_potential_rationale: `Estimation déduite des données disponibles : preuves ${proofProvided ? 'partielles' : 'absentes'}, CTA ${ctaStrength}, audience ${hasAudience ? 'précisée' : 'à clarifier'}.`,
      clarity_score,
      differentiation_score,
      proof_score,
      audience_fit_score,
      conversion_readiness_score,
      confidence_score,
    },

    missing: {
      missing_information: missingCategories.map((c) => `Donnée manquante : ${c}.`),
      recommended_followup_questions: recommendedFollowups,
      must_have_before_campaign: !hasCTA ? ['CTA unique et trackable.'] : [],
      nice_to_have_before_campaign: !proofProvided ? ['Au moins 2 preuves chiffrées ou témoignages nominatifs.'] : [],
    },

    compliance: {
      legal_sensitivity: 'low',
      regulated_claims_risk: [],
      prohibited_promises: input.forbidden_claims ?? [],
      safe_language_guidance: ['Éviter les promesses chiffrées non sourcées.'],
    },

    learning_signals: {
      extraction_confidence: extraction,
      ambiguity_level: ambiguity,
      missing_data_categories: missingCategories,
      likely_user_corrections: [],
      feedback_hooks: [
        'channel_recommendation_acceptance',
        'proof_gap_detection_accuracy',
      ],
      improvement_priority: improvementPriority,
    },

    future_memory_writes: {
      offer_memory_candidates: input.current_offer_name ? [input.current_offer_name] : [],
      style_dna_candidates: input.brand_tone_hint ? [input.brand_tone_hint] : [],
      objection_memory_candidates: input.customer_objections ?? [],
      proof_memory_candidates: input.proof_points ?? [],
      channel_preference_candidates: bestChannels.map((c) => `prefer:${c}`),
    },
  };
}
