/**
 * Demo seed — loaded ONLY on explicit user action ("Charger des exemples").
 * Never injected automatically. Pure data, no side effects.
 */

import type { Asset, Offer } from './types';
import { KIND_TO_DIMENSIONS } from './types';

const NOW = '2026-05-05T00:00:00.000Z';

const o1: Offer = {
  id: 'ofr_demo_1',
  name: 'Atelier Nova — Clarification offre',
  status: 'draft',
  goal: 'clarify_offer',
  language: 'fr',
  brief: {
    businessName: 'Atelier Nova',
    offer:
      "Accompagnement de 4 semaines pour aider les indépendants à clarifier leur offre et créer une page de vente simple.",
    targetAudience: 'indépendants et consultants qui vendent des services',
    tone: 'professional',
    language: 'fr',
    platforms: ['linkedin', 'email'],
    proofPoints: ['Méthode testée sur 12 offres de consultants'],
  },
  confidence_score: 80,
  primary_channel: 'linkedin',
  createdAt: NOW,
  updatedAt: NOW,
};

const o2: Offer = {
  id: 'ofr_demo_2',
  name: 'Nova Studio — B2B SaaS landing',
  status: 'ready',
  goal: 'landing_page',
  language: 'en',
  brief: {
    businessName: 'Nova Studio',
    offer:
      'A 4-week program helping consultants articulate their offer and ship a simple sales page.',
    targetAudience: 'consultants who sell services',
    tone: 'premium',
    language: 'en',
    platforms: ['linkedin', 'landing_page'],
    proofPoints: ['Tested on 12 consultant offers'],
  },
  confidence_score: 80,
  primary_channel: 'landing_page',
  createdAt: NOW,
  updatedAt: NOW,
};

const o3: Offer = {
  id: 'ofr_demo_3',
  name: 'Lemon Coaching — objections',
  status: 'scheduled_mock',
  goal: 'objections',
  language: 'fr',
  brief: {
    businessName: 'Lemon Coaching',
    offer:
      "Coaching individuel 6 semaines pour les fondateurs solos qui veulent dégager du temps stratégique sans embaucher.",
    targetAudience: 'fondateurs solos sur-occupés',
    tone: 'friendly',
    language: 'fr',
    platforms: ['linkedin'],
    proofPoints: ['18 fondateurs accompagnés sur 9 mois'],
  },
  confidence_score: 75,
  primary_channel: 'linkedin',
  createdAt: NOW,
  updatedAt: NOW,
};

// A small set of assets attached to o1 — enough to populate the Assets tab.
const a1_hooks: Asset[] = [
  {
    id: 'ast_demo_1',
    offerId: 'ofr_demo_1',
    kind: 'hook',
    body: "Constat : indépendants qui vendent des services bute encore sur difficulté à formuler une offre claire et différenciante.",
    dimensions: KIND_TO_DIMENSIONS.hook,
    status: 'draft',
    source: 'mock',
    createdAt: NOW,
  },
  {
    id: 'ast_demo_2',
    offerId: 'ofr_demo_1',
    kind: 'angle',
    body: "Clarté avant scale — Avant de pousser plus de trafic, on rend l'offre lisible en 30 secondes. Cadre clair, étapes mesurables.\n\n[best for: indépendants qui sentent que leur message ne convertit pas]",
    dimensions: KIND_TO_DIMENSIONS.angle,
    status: 'draft',
    source: 'mock',
    createdAt: NOW,
  },
  {
    id: 'ast_demo_3',
    offerId: 'ofr_demo_1',
    kind: 'cta',
    body: 'Réserver un créneau de cadrage — intent: decision',
    dimensions: KIND_TO_DIMENSIONS.cta,
    status: 'draft',
    source: 'mock',
    createdAt: NOW,
  },
];

export const DEMO_SEED: { offers: Offer[]; assets: Asset[] } = {
  offers: [o1, o2, o3],
  assets: a1_hooks,
};
