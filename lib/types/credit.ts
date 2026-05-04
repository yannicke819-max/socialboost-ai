import type { PlanId, Period } from './domain';

// Credit System — pricing, ledger, lifecycle.

export type CostCategory =
  | 'text-generation'
  | 'campaign-blueprint'
  | 'carousel-outline'
  | 'video-script'
  | 'style-dna-training'
  | 'critic-qa-pass'
  | 'regeneration'
  | 'trend-scan'
  | 'weekly-growth-brief'
  | 'image-generation'
  | 'avatar-video-30s'
  | 'generative-video-5s'
  | 'voice-clone-tts-1min';

export interface CostEstimate {
  category: CostCategory;
  user_credit_cost: number;          // what the user is charged
  provider_cost_cents: number;       // raw API cost in USD cents (audit-only)
  margin_factor: number;             // user_credit * 0.025_EUR / provider_cost_cents
  breakdown: { component: string; credits: number }[];
}

export interface ActualCost {
  user_credit_cost: number;
  provider_cost_cents: number;
  tokens_in?: number;
  tokens_out?: number;
  duration_ms?: number;
}

// Ledger — every billable event is a row.

export type TxnType =
  | 'reserve'         // hold credits before API call
  | 'finalize'        // adjust to actual after call
  | 'refund'          // failed call
  | 'topup'           // user purchase
  | 'monthly_grant'   // 1st of the month
  | 'expiration';     // (rare) credits expire on plan change

export interface CreditLedgerEntry {
  id: string;
  user_id: string;
  txn_type: TxnType;
  amount_credits: number;            // signed (+ for grant/topup, - for usage)
  provider_cost_cents?: number;
  balance_after: number;
  related_step_id?: string;
  related_asset_id?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// Pre-check — called BEFORE reserving.

export interface PreCheckResult {
  allowed: boolean;
  reason?:
    | 'insufficient_credits'
    | 'plan_cap_reached'
    | 'requires_confirmation'
    | 'concurrent_limit_reached';
  current_balance: number;
  estimated_after: number;
  requires_user_confirmation: boolean; // true when estimate > confirmation_threshold (default 50)
}

// Reservation token — opaque handle returned by reserve, consumed by finalize/refund.

export interface ReservationToken {
  txn_id: string;
  reserved_amount: number;
  expires_at: string;                 // ISO timestamp, ~5 minutes from reserve
}

// Plan capabilities — orthogonal to credits.

export interface PlanCaps {
  monthly_credits: number;
  max_brand_voices: number;
  max_concurrent_campaigns: number;
  max_social_accounts: number;
  max_seats: number;
  premium_video_enabled: boolean;
  weekly_growth_brief_enabled: boolean;
  api_access: boolean;
}

export const PLAN_ALLOCATIONS: Record<PlanId, PlanCaps> = {
  free: {
    monthly_credits: 20,
    max_brand_voices: 1,
    max_concurrent_campaigns: 1,
    max_social_accounts: 1,
    max_seats: 1,
    premium_video_enabled: false,
    weekly_growth_brief_enabled: false,
    api_access: false,
  },
  solo: {
    monthly_credits: 150,
    max_brand_voices: 1,
    max_concurrent_campaigns: 3,
    max_social_accounts: 2,
    max_seats: 1,
    premium_video_enabled: false,
    weekly_growth_brief_enabled: false,
    api_access: false,
  },
  pro: {
    monthly_credits: 600,
    max_brand_voices: 3,
    max_concurrent_campaigns: 10,
    max_social_accounts: 5,
    max_seats: 1,
    premium_video_enabled: true,
    weekly_growth_brief_enabled: true,
    api_access: false,
  },
  agency: {
    monthly_credits: 2000,
    max_brand_voices: 10,
    max_concurrent_campaigns: 100,    // soft, fair-use enforced
    max_social_accounts: 20,
    max_seats: 3,
    premium_video_enabled: true,
    weekly_growth_brief_enabled: true,
    api_access: true,
  },
};

// Topups — Stripe one-time, available to paid plans only.

export interface TopupOption {
  id: 'topup-100' | 'topup-500' | 'topup-2000';
  credits: number;
  price_eur: number;
}

export const TOPUP_OPTIONS: TopupOption[] = [
  { id: 'topup-100', credits: 100, price_eur: 9 },
  { id: 'topup-500', credits: 500, price_eur: 39 },
  { id: 'topup-2000', credits: 2000, price_eur: 129 },
];

// Confirmation threshold — premium ops require explicit user confirmation.
export const PREMIUM_CONFIRMATION_THRESHOLD = 50;

// Usage report — surfaced in /billing/credits.

export interface UsageReport {
  user_id: string;
  period: Period;
  monthly_grant: number;
  topups_total: number;
  consumed: number;
  balance: number;
  by_category: Record<CostCategory, number>;
}
