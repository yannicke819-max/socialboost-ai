import type { FunnelStage, GoalType, Period } from './domain';

// Offer Memory — the user's product/service offerings, used by the Campaign Engine.

export type OfferType =
  | 'coaching'
  | 'course'
  | 'product'
  | 'service'
  | 'audit'
  | 'webinar'
  | 'newsletter';

export type Recurrence = 'one-time' | 'monthly' | 'yearly';

export type Seasonality = 'evergreen' | 'launch' | 'limited-time';

export interface OfferPrice {
  amount: number;
  currency: string;
  recurrence?: Recurrence;
}

export interface Offer {
  id: string;
  user_id: string;
  name: string;
  type: OfferType;
  promise: string;          // single sentence value prop
  audience: string;         // target description
  price?: OfferPrice;
  proof_points: string[];   // testimonials, metrics, credentials
  objections: string[];     // known objections to handle
  cta_url: string;          // Calendly, Stripe link, landing
  funnel_stage: FunnelStage;
  seasonality?: Seasonality;
  created_at: string;       // ISO timestamp
  updated_at: string;
}

// Goal of the month — drives the Channel Strategist priorities.

export interface MonthlyGoal {
  id: string;
  user_id: string;
  period: Period;           // '2026-05'
  type: GoalType;
  target_metric?: { metric: string; target_value: number };
  linked_offer_id?: string;
  linked_url?: string;
  notes?: string;
}

// OfferBrief — the structured output of stage 1 (Offer Brain)

export interface OfferBrief {
  offer_id: string;
  problem: string;
  solution: string;
  audience: string;
  unique_value_proposition: string;
  proof_summary: string[];
  primary_cta: string;
  cta_url: string;
  urgency_signal?: string;
  language: 'fr' | 'en' | 'es' | 'it' | 'de';
}
