import type { Platform } from './domain';

// Campaign — a pipeline run from offer to ready-to-publish assets.

export type CampaignStatus =
  | 'draft'
  | 'generating'
  | 'review'
  | 'approved'
  | 'scheduled'
  | 'exported'
  | 'failed';

export type BriefInputType = 'text' | 'url' | 'transcript' | 'voice-note';

export interface Campaign {
  id: string;
  user_id: string;
  offer_id: string;
  goal_id: string;
  brief_input: { type: BriefInputType; content: string };
  status: CampaignStatus;
  created_at: string;
  pipeline_run_id: string;
}

// PipelineRun — one execution of the 8-stage pipeline.

export type PipelineStatus = 'running' | 'completed' | 'failed';

export interface PipelineRun {
  id: string;
  campaign_id: string;
  agent_versions: Record<string, string>; // { 'offer-brain': '1.2.0', ... }
  total_credits_consumed: number;
  total_duration_ms: number;
  status: PipelineStatus;
  steps: CampaignStep[];
}

export type StepStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'; // Market Radar may self-skip

export interface CampaignStep {
  id: string;
  pipeline_run_id: string;
  step_index: number;
  agent_name: string;
  agent_version: string;
  input: unknown;             // typed in agent contracts, opaque at storage layer
  output: unknown;
  metadata: StepMetadata;
  started_at: string;
  completed_at?: string;
  status: StepStatus;
}

export interface StepMetadata {
  model: string;
  prompt_version: string;
  tokens_in: number;
  tokens_out: number;
  cached_tokens: number;
  duration_ms: number;
  credits_consumed: number;
  retries: number;
  fallback_used?: boolean;
}

// Channel Strategy — output of stage 3.

export interface ChannelStrategy {
  campaign_id: string;
  per_platform: ChannelStrategyEntry[];
}

export interface ChannelStrategyEntry {
  platform: Platform;
  selected_angle: string;
  format: string;             // 'long-form-post' | 'carousel-outline' | 'thread' | 'video-script'
  rationale: string;          // why this angle fits this platform
  recommended_length_chars: number;
  recommended_publish_window: string;  // 'tuesday-morning' | 'evening' | etc.
}
