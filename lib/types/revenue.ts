import type { Period } from './domain';

// Revenue Signal — short-link click tracking + per-campaign aggregates.
// Not implemented at AI-000. These types are the contract for AI-010.

export interface TrackedLink {
  id: string;
  short_id: string;            // 'sb.link/AbCdE'
  destination_url: string;
  campaign_id: string;
  asset_id?: string;           // optional per-asset attribution
  click_count: number;         // denormalized for fast read
  created_at: string;
}

export interface LinkClick {
  id: string;
  short_id: string;
  ts: string;                  // ISO timestamp
  ip_hash: string;             // SHA256 + salt
  user_agent: string;
  geo?: string;                // anonymized country code
  referer?: string;
}

export interface RevenueSignal {
  campaign_id: string;
  period: Period;
  total_clicks: number;
  unique_clicks: number;       // by ip_hash
  top_assets: { asset_id: string; clicks: number }[];
  attributed_revenue?: number; // V3 only — requires Stripe webhook integration
  computed_at: string;
}

// Performance — engagement signals from social platforms (publications PR, AI-014+).

export interface PerformanceSnapshot {
  publication_id: string;
  captured_at: string;
  impressions: number;
  engagements: number;          // likes + comments + shares
  clicks: number;
  raw: Record<string, unknown>; // platform-specific payload
}
